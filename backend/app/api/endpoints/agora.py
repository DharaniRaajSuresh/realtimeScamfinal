from fastapi import APIRouter, Query
from app.core.config import settings

router = APIRouter()

@router.get("/token/{channel_name}")
async def get_agora_token(channel_name: str, uid: int = Query(0, description="User ID")):
    """In test mode (no App Certificate), no token is needed. Return null."""
    return {
        "token": None,
        "uid": uid,
        "channel": channel_name,
        "appId": settings.AGORA_APP_ID
    }
