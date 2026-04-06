"""
Voice Processing API Endpoints
===============================
POST /api/voice/process     — Full pipeline (victim clicks Report to Police)
POST /api/voice/compare     — Police compare (upload audio, search DB)
GET  /api/voice/voiceprints — List all voiceprints for dashboard
GET  /api/voice/voiceprint/{point_id} — Get single voiceprint details
POST /api/voice/setup       — One-time Qdrant collection + S3 bucket setup
"""

import os
import uuid
from datetime import datetime
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from typing import Optional

router = APIRouter()


def get_voice_service():
    """Lazy import to avoid loading ML models at module level."""
    from app.services.voice_service import voice_service
    return voice_service


@router.post("/setup")
async def setup_voice_pipeline():
    """
    One-time setup — creates Qdrant collection + Supabase Storage bucket (via S3 API).
    Safe to call multiple times.
    """
    svc = get_voice_service()
    qdrant_result = svc.setup_collection()
    bucket_result = svc.setup_storage_bucket()
    return {
        "status": "success",
        "qdrant": qdrant_result,
        "storage": bucket_result
    }


@router.post("/process")
async def process_voice(
    audio: UploadFile = File(...),
    case_id: Optional[str] = Form(None),
    user_id: Optional[str] = Form(""),
    call_id: Optional[str] = Form(""),
    scam_type: Optional[str] = Form("Unknown"),
    risk_score: Optional[int] = Form(0),
    tactics: Optional[str] = Form(""),
    city: Optional[str] = Form(""),
    district: Optional[str] = Form(""),
    transcript: Optional[str] = Form(""),
    summary: Optional[str] = Form(""),
    channel_id: Optional[str] = Form("")
):
    """
    FULL PIPELINE — user clicks "Report to Police".

    Backend receives:
      - audio file (.webm/.opus/.wav from MediaRecorder)
      - userId, callId
      - scam_type, risk_score, tactics, etc.

    Pipeline:
      1. Upload FULL audio → Supabase Storage (S3)
      2. Save case record → Postgres
      3. Convert to WAV → Run diarization
      4. Identify scammer → extract embedding
      5. Compare against Qdrant DB
      6. If match → "Repeat Scammer"; else → store as new
      7. Return verdict to frontend

    Returns:
      - "Report submitted successfully"
      - If match: "This scammer has been previously reported"
    """
    svc = get_voice_service()

    # Generate case_id if not provided
    if not case_id:
        case_id = f"CYB-{int(datetime.utcnow().timestamp())}"

    # Read audio bytes
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    # Determine file extension
    ext = os.path.splitext(audio.filename or "recording.webm")[1] or ".webm"

    metadata = {
        "user_id": user_id,
        "call_id": call_id or channel_id,
        "scam_type": scam_type,
        "risk_score": risk_score,
        "tactics": tactics,
        "city": city,
        "district": district,
        "transcript": transcript,
        "summary": summary,
        "channel_id": channel_id
    }

    try:
        # Run the full pipeline (handles temp files internally)
        result = svc.process_call_report(
            audio_bytes=audio_bytes,
            case_id=case_id,
            metadata=metadata,
            file_ext=ext
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compare")
async def police_compare(
    audio: UploadFile = File(...)
):
    """
    Police compare — upload audio, search entire Qdrant DB for voice match.
    Returns: match report with confidence, victim count, linked cases.
    """
    svc = get_voice_service()

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    ext = os.path.splitext(audio.filename or "compare.webm")[1] or ".webm"

    try:
        result = svc.police_compare(audio_bytes=audio_bytes, file_ext=ext)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/voiceprints")
async def list_voiceprints():
    """
    Returns unified forensic reports from Postgres for the police dashboard.
    (v2.0 - Merges Supabase cases + Qdrant match metadata)
    """
    svc = get_voice_service()
    # v2.0: Fetch from forensic reporting API
    reports = svc.list_police_reports()

    # Compute summary stats
    active_count = sum(1 for r in reports if not r.get("is_repeat")) # Initial suspects
    total_victims = sum(1 for r in reports) # For now, each report is a victim entry

    return {
        "voiceprints": reports,
        "stats": {
            "total": len(reports),
            "active": active_count,
            "total_victims": total_victims
        }
    }


@router.get("/voiceprint/{point_id}")
async def get_voiceprint(point_id: str):
    """
    Get full details for a single voiceprint including signed audio URL.
    """
    svc = get_voice_service()
    vp = svc.get_voiceprint(point_id)

    if not vp:
        raise HTTPException(status_code=404, detail="Voiceprint not found")

    return vp
