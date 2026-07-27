from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import os
import uuid
import json

from app.database.connection import get_db
from app.database.models import User, Setting
from app.routers.auth import get_current_user
from app.services.ocr_service import OCRService

router = APIRouter(prefix="/screenshot", tags=["Screenshot Analyzer"])

@router.post("/analyze")
async def analyze_screenshot(
    file: UploadFile = File(...),
    prompt: str = Form("Perform OCR on this image and explain any charts, diagrams, or UI components. Return clean formatted markdown."),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify file extension
    filename = file.filename
    _, ext = os.path.splitext(filename.lower())
    if ext not in [".png", ".jpg", ".jpeg", ".webp"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid image format. Supported formats: PNG, JPG, JPEG, WEBP"
        )
        
    # Create directory if needed
    user_screenshot_dir = os.path.join(os.getcwd(), "nexora_data", "screenshots", current_user.id)
    os.makedirs(user_screenshot_dir, exist_ok=True)
    
    # Save image file
    file_id = str(uuid.uuid4())
    file_path = os.path.join(user_screenshot_dir, f"{file_id}{ext}")
    
    try:
        with open(file_path, "wb") as buffer:
            shutil_contents = file.file.read()
            buffer.write(shutil_contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save screenshot locally: {str(e)}")
        
    # Get active API keys from setting table
    settings_db = db.query(Setting).filter(Setting.user_id == current_user.id).first()
    api_keys = {}
    if settings_db and settings_db.api_keys_json:
        try:
            api_keys = json.loads(settings_db.api_keys_json)
        except Exception:
            pass
            
    # Run OCR & Explanation Service
    try:
        analysis_markdown = await OCRService.analyze_image(
            image_path=file_path,
            prompt=prompt,
            api_keys=api_keys
        )
        return {
            "status": "success",
            "file_id": file_id,
            "filename": filename,
            "analysis": analysis_markdown
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze screenshot: {str(e)}"
        )
