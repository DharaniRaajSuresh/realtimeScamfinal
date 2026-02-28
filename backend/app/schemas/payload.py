from pydantic import BaseModel
from typing import List, Optional

class AnalysisRequest(BaseModel):
    channelId: str
    speakerId: str
    text: str

class RiskResponseData(BaseModel):
    risk_score: int
    scam_type: str
    tactics: List[str]
    vulnerability: str
    trigger_golden_minute: bool

class RiskResponse(BaseModel):
    type: str = "RISK_UPDATE"
    channelId: str
    data: RiskResponseData
