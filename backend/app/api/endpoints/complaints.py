from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.connection_manager import manager

router = APIRouter()

class ComplaintRequest(BaseModel):
    channelId: str
    victimUid: str
    transcript: str
    riskScore: int
    reasoning: str

@router.post("/send")
async def send_complaint(complaint: ComplaintRequest):
    """
    Receives a complaint from a user and broadcasts it to all connected police dashboards.
    """
    try:
        # Prepare the notification payload
        payload = {{
            "type": "COMPLAINT_FILED",
            "data": {{
                "channelId": complaint.channelId,
                "victimUid": complaint.victimUid,
                "riskScore": complaint.riskScore,
                "reasoning": complaint.reasoning,
                "timestamp": "JUST NOW",
                "location": "CHENNAI" # Mock location
            }}
        }}
        
        # Broadcast to anyone listening on this channel (Police use the same channels)
        # and also a special 'police-alerts' channel if we had one.
        # For now, we broadcast to the channelId so the Overview.jsx (which listens to that channel) sees it.
        await manager.broadcast(complaint.channelId, payload)
        
        return {{"status": "success", "message": "Complaint filed with Cybercrime Division"}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
