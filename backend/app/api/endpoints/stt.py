from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any

from app.services.agora_stt import agora_stt_manager
from app.api.endpoints.analyze import process_audio_text

router = APIRouter()

class ChannelRequest(BaseModel):
    channel_name: str

class StopRequest(BaseModel):
    agent_id: str

@router.post("/start")
async def start_stt(data: ChannelRequest):
    """Starts the real-time transcription agent via Agora REST API."""
    result = agora_stt_manager.start_transcription(data.channel_name)
    if "error" in result:
        # If it's a TaskConflict (409), the agent is already running — that's fine
        if "conflict" in str(result["error"]).lower() or "TaskConflict" in str(result["error"]):
            return {"message": "STT already running for this channel", "agent_id": None}
        raise HTTPException(status_code=500, detail=result["error"])
    return {"message": "STT started", "agent_id": result.get("agent_id")}

@router.post("/stop")
async def stop_stt(data: StopRequest):
    """Stops a running transcription agent."""
    result = agora_stt_manager.stop_transcription(data.agent_id)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return {"message": "STT stopped", "status": result}

@router.post("/callback")
async def stt_callback(request: Request, background_tasks: BackgroundTasks):
    """
    Webhook endpoint meant to receive POSTs from Agora STT.
    Agora sends transcription payloads representing what the bots heard in the channel.
    """
    try:
        payload = await request.json()
        print("Received STT Callback:", payload)
        
        # Depending on Agora's exact webhook structure, we extract the recognized text.
        # usually it's in a words/sentences array structure.
        # Fast extraction path per sentence:
        
        # Agora Real-Time STT usually pushes messages via standard webhook data wraps
        # (Assuming the text is found in payload['words'] or payload['text'] based on specific event types)
        
        # Fallback extraction logic to prevent crashing on differing schemas:
        text = payload.get("text")
        
        if not text:
            # Check nested schema
            words_array = payload.get("words", [])
            if words_array:
                text = " ".join([w.get("text", "") for w in words_array])
                
        if text:
            speaker_id = payload.get("uid", "remote")
            channel_name = payload.get("channelName", "unknown-channel")
            
            # Offload heavy NLP analysis to a background task so Agora's REST request doesn't timeout
            background_tasks.add_task(process_audio_text, channel_name, str(speaker_id), text)
            
        return {"status": "ok"}
    except Exception as e:
        print("Error processing STT callback:", e)
        return {"status": "error", "message": str(e)}
