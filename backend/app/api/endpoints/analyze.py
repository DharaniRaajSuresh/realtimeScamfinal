from fastapi import APIRouter, Depends
from app.schemas.payload import AnalysisRequest, RiskResponse, RiskResponseData
from app.services.nlp_engine import ScamEngine
from app.services.connection_manager import manager

router = APIRouter()
engine = ScamEngine()

async def process_audio_text(channelId: str, speakerId: str, text: str):
    """Core logic to analyze speech and broadcast radar data via websocket."""
    # Calculate risk based on transcript
    analysis = await engine.calculate_risk(text, speakerId)
    
    # Broadcast to all connected clients (e.g. Police Dashboard or User App)
    response_data = RiskResponseData(
        risk_score=analysis["risk_score"],
        scam_type=analysis["scam_type"],
        tactics=analysis["tactics"],
        vulnerability=analysis["vulnerability"],
        trigger_golden_minute=analysis["risk_score"] > 85
    )
    
    payload = RiskResponse(
        channelId=channelId,
        data=response_data
    ).model_dump()
    
    await manager.broadcast(channelId, payload)
    return analysis

@router.post("/analyze")
async def analyze_text(request: AnalysisRequest):
    # This endpoint is now hit every 3 seconds with a chunk payload.
    # We will pass it to the engine. The frontend maintains the history.
    analysis = await process_audio_text(request.channelId, request.speakerId, request.text)
    return {"status": "success", "analysis": analysis}

from pydantic import BaseModel

class StoreRequest(BaseModel):
    channelId: str
    transcript: str
    riskScore: int
    reasoning: str

from app.services.mongo_service import mongo_service

@router.post("/store_conversation")
async def store_conversation(req: StoreRequest):
    """Stores the fully transcripted conversation to MongoDB when call ends."""
    inserted_id = mongo_service.store_conversation(
        channel_id=req.channelId,
        transcript=req.transcript,
        risk_score=req.riskScore,
        reasoning=req.reasoning
    )
    if inserted_id:
        return {"status": "success", "id": inserted_id}
    return {"status": "error", "message": "MongoDB Insertion Failed"}
