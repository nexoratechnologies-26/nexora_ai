from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json

from app.database.connection import get_db
from app.database.models import User, Setting
from app.routers.auth import get_current_user
from app.schemas import SettingResponse, SettingUpdate

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("", response_model=SettingResponse)
def get_user_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    setting = db.query(Setting).filter(Setting.user_id == current_user.id).first()
    if not setting:
        # Create setting if somehow missing
        setting = Setting(
            user_id=current_user.id,
            theme="dark",
            model_provider="openai",
            model_name="gpt-4o",
            api_keys_json=json.dumps({
                "openai": "",
                "gemini": "",
                "claude": "",
                "ollama_host": "http://localhost:11434"
            })
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting

@router.put("", response_model=SettingResponse)
def update_user_settings(
    setting_update: SettingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    setting = db.query(Setting).filter(Setting.user_id == current_user.id).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Settings not found")
        
    update_data = setting_update.model_dump(exclude_unset=True)
    
    # Handle API keys JSON update merge instead of full overwrite if needed
    if "api_keys_json" in update_data:
        try:
            new_keys = json.loads(update_data["api_keys_json"])
            try:
                existing_keys = json.loads(setting.api_keys_json)
            except Exception:
                existing_keys = {}
            
            # Merge
            existing_keys.update(new_keys)
            setting.api_keys_json = json.dumps(existing_keys)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid API Keys JSON format")
            
        # Remove from update data to prevent simple string assignment
        del update_data["api_keys_json"]
        
    for key, value in update_data.items():
        setattr(setting, key, value)
        
    db.commit()
    db.refresh(setting)
    return setting
