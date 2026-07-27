from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import uuid
import json

from app.database.connection import get_db
from app.database.models import User, Setting
from app.routers.auth import get_current_user
from app.services.voice_service import VoiceService

router = APIRouter(prefix="/voice", tags=["Voice Assistant"])

@router.post("/stt")
async def speech_to_text(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify file extension (wav, mp3, m4a, webm)
    filename = file.filename
    _, ext = os.path.splitext(filename.lower())
    
    # Save audio temporarily
    user_voice_dir = os.path.join(os.getcwd(), "nexora_data", "voice", current_user.id)
    os.makedirs(user_voice_dir, exist_ok=True)
    
    file_id = str(uuid.uuid4())
    file_path = os.path.join(user_voice_dir, f"{file_id}{ext}")
    
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(file.file.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save audio file: {str(e)}")
        
    # Get settings
    settings_db = db.query(Setting).filter(Setting.user_id == current_user.id).first()
    api_keys = {}
    if settings_db and settings_db.api_keys_json:
        try:
            api_keys = json.loads(settings_db.api_keys_json)
        except Exception:
            pass
            
    # Perform speech to text
    try:
        text = await VoiceService.speech_to_text(file_path, api_keys=api_keys)
        
        # Cleanup file after processing
        if os.path.exists(file_path):
            os.remove(file_path)
            
        return {"text": text}
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@router.post("/tts")
async def text_to_speech(
    text: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_voice_dir = os.path.join(os.getcwd(), "nexora_data", "voice", current_user.id)
    os.makedirs(user_voice_dir, exist_ok=True)
    
    file_path = os.path.join(user_voice_dir, f"tts_{str(uuid.uuid4())[:8]}.mp3")
    
    # Get settings
    settings_db = db.query(Setting).filter(Setting.user_id == current_user.id).first()
    api_keys = {}
    if settings_db and settings_db.api_keys_json:
        try:
            api_keys = json.loads(settings_db.api_keys_json)
        except Exception:
            pass
            
    # Generate text to speech file
    try:
        audio_path = await VoiceService.text_to_speech(text, file_path, api_keys=api_keys)
        return FileResponse(audio_path, media_type="audio/mpeg", filename="tts.mp3")
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to generate text-to-speech: {str(e)}")
