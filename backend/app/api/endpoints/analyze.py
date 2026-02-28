from fastapi import APIRouter, Depends
from app.schemas.payload import AnalysisRequest, RiskResponse, RiskResponseData
from app.services.nlp_engine import ScamEngine
from app.services.connection_manager import manager

router = APIRouter()
engine = ScamEngine()

async def process_audio_text(channelId: str, speakerId: str, text: str):
    """Core logic to analyze speech and broadcast radar data via websocket."""
    # Calculate risk based on transcript
    analysis = engine.calculate_risk(text, speakerId)
    
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
    analysis = await process_audio_text(request.channelId, request.speakerId, request.text)
    return {"status": "success", "analysis": analysis}
