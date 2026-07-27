from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.database.connection import get_db
from app.database.models import User, Chat, Document, Note, Prompt, Message
from app.routers.auth import get_current_user
from app.routers.prompts import BUILT_IN_PROMPTS
from app.schemas import DashboardOverview, DocumentResponse, NoteResponse, PromptResponse
from datetime import datetime

router = APIRouter(prefix="/workspace", tags=["Workspace Hub"])

@router.get("/dashboard", response_model=DashboardOverview)
def get_dashboard_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Recent Chats
    recent_chats_db = db.query(Chat).filter(Chat.user_id == current_user.id).order_by(Chat.created_at.desc()).limit(5).all()
    recent_chats = []
    for chat in recent_chats_db:
        # Get count of messages in this chat
        msg_count = db.query(Message).filter(Message.chat_id == chat.id).count()
        recent_chats.append({
            "id": chat.id,
            "title": chat.title,
            "provider": chat.provider,
            "model": chat.model,
            "message_count": msg_count,
            "updated_at": chat.updated_at
        })
        
    # 2. Recent Documents
    recent_docs = db.query(Document).filter(Document.user_id == current_user.id).order_by(Document.created_at.desc()).limit(5).all()
    
    # 3. Recent Notes
    recent_notes = db.query(Note).filter(Note.user_id == current_user.id).order_by(Note.updated_at.desc()).limit(5).all()
    
    # 4. Favorite/Built-in Prompts
    # Seed 3 favorite built-in prompts
    fav_prompts = []
    from datetime import datetime
    for i in range(min(3, len(BUILT_IN_PROMPTS))):
        bp = BUILT_IN_PROMPTS[i]
        fav_prompts.append(Prompt(
            id=bp["id"],
            title=bp["title"],
            template=bp["template"],
            category=bp["category"],
            is_custom=bp["is_custom"],
            created_at=datetime.utcnow()
        ))
        
    # Add any user custom prompts (limit 2)
    custom_prompts = db.query(Prompt).filter(Prompt.user_id == current_user.id).limit(2).all()
    fav_prompts.extend(custom_prompts)
    
    # 5. AI usage stats
    total_chats = db.query(Chat).filter(Chat.user_id == current_user.id).count()
    total_docs = db.query(Document).filter(Document.user_id == current_user.id).count()
    total_notes = db.query(Note).filter(Note.user_id == current_user.id).count()
    
    # Total messages
    chat_ids = [c.id for c in recent_chats_db]
    total_messages = 0
    if chat_ids:
        total_messages = db.query(Message).filter(Message.chat_id.in_(chat_ids)).count()
        
    ai_usage_stats = {
        "total_chats": total_chats,
        "total_documents": total_docs,
        "total_notes": total_notes,
        "total_messages": total_messages,
        "tokens_spent": {
            "openai": total_chats * 1250, # Mock token tracking based on chat interactions
            "gemini": total_docs * 3400,
            "claude": total_notes * 800,
            "ollama": 0
        }
    }
    
    return {
        "recent_chats": recent_chats,
        "recent_documents": recent_docs,
        "recent_notes": recent_notes,
        "ai_usage_stats": ai_usage_stats,
        "favorite_prompts": fav_prompts
    }
