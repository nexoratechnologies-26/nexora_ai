from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json

from app.database.connection import get_db
from app.database.models import User, Setting
from app.routers.auth import get_current_user
from app.services.ai_provider import AIProviderService

router = APIRouter(prefix="/clipboard", tags=["Clipboard AI"])

@router.post("/process")
async def process_clipboard_text(
    text: str,
    action: str, # summarize, translate, improve, explain_code
    target_language: str = "Spanish",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not text.strip():
        raise HTTPException(status_code=400, detail="Clipboard content is empty")
        
    # Get user settings
    settings_db = db.query(Setting).filter(Setting.user_id == current_user.id).first()
    provider = settings_db.model_provider if settings_db else "openai"
    model = settings_db.model_name if settings_db else "gpt-4o"
    api_keys = {}
    if settings_db and settings_db.api_keys_json:
        try:
            api_keys = json.loads(settings_db.api_keys_json)
        except Exception:
            pass
            
    # Define action prompt
    if action == "summarize":
        prompt = f"Summarize the following clipboard text in a few clear bullet points:\n\n{text}"
    elif action == "translate":
        prompt = f"Translate the following clipboard text into {target_language}. Maintain structure and style:\n\n{text}"
    elif action == "improve":
        prompt = f"Improve the writing, grammar, and flow of the following text. Keep it professional:\n\n{text}"
    elif action == "explain_code":
        prompt = f"Explain what the following code block does step-by-step and identify any issues:\n\n```\n{text}\n```"
    else:
        raise HTTPException(status_code=400, detail="Invalid clipboard processing action")
        
    try:
        result = await AIProviderService.generate_response(
            provider=provider,
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
            max_tokens=1000,
            api_keys=api_keys
        )
        return {
            "status": "success",
            "action": action,
            "original_text": text,
            "processed_text": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Clipboard AI processing failed: {str(e)}"
        )
