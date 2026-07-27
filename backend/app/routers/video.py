from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel
import json

from app.database.connection import get_db
from app.database.models import User, Setting
from app.routers.auth import get_current_user
from app.services.ocr_service import OCRService

router = APIRouter(prefix="/video", tags=["Real-Time Video Q&A"])

class VideoQARequest(BaseModel):
    image_base64: str
    prompt: str = "What is in front of the camera right now? Describe and answer."

@router.post("/qa")
async def analyze_live_video_frame(
    payload: VideoQARequest = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not payload.image_base64:
        raise HTTPException(
            status_code=400,
            detail="image_base64 frame payload is required."
        )

    # Get active API keys from setting table
    settings_db = db.query(Setting).filter(Setting.user_id == current_user.id).first()
    api_keys = {}
    if settings_db and settings_db.api_keys_json:
        try:
            api_keys = json.loads(settings_db.api_keys_json)
        except Exception:
            pass

    try:
        analysis_markdown = await OCRService.analyze_video_frame_base64(
            base64_data=payload.image_base64,
            prompt=payload.prompt,
            api_keys=api_keys
        )
        return {
            "status": "success",
            "prompt": payload.prompt,
            "analysis": analysis_markdown
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze live video stream frame: {str(e)}"
        )
