from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json

from app.database.connection import get_db
from app.database.models import User, Note, Setting
from app.routers.auth import get_current_user
from app.schemas import NoteResponse, NoteCreate, NoteUpdate
from app.services.ai_provider import AIProviderService

router = APIRouter(prefix="/notes", tags=["Notes Manager"])

@router.get("", response_model=List[NoteResponse])
def get_user_notes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Note).filter(Note.user_id == current_user.id).order_by(Note.updated_at.desc()).all()

@router.post("", response_model=NoteResponse)
def create_note(
    note_in: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    note = Note(
        user_id=current_user.id,
        title=note_in.title,
        content_markdown=note_in.content_markdown,
        folder_name=note_in.folder_name or "General"
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

@router.get("/{note_id}", response_model=NoteResponse)
def get_note(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note

@router.put("/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: str,
    note_update: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    update_data = note_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(note, key, value)
        
    db.commit()
    db.refresh(note)
    return note

@router.delete("/{note_id}")
def delete_note(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
    return {"status": "success", "message": "Note deleted successfully"}

@router.post("/{note_id}/summarize", response_model=NoteResponse)
async def generate_note_summary(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    if not note.content_markdown.strip():
        raise HTTPException(status_code=400, detail="Cannot summarize empty note")
        
    # Get active LLM settings
    settings_db = db.query(Setting).filter(Setting.user_id == current_user.id).first()
    provider = settings_db.model_provider if settings_db else "openai"
    model = settings_db.model_name if settings_db else "gpt-4o"
    api_keys = {}
    if settings_db and settings_db.api_keys_json:
        try:
            api_keys = json.loads(settings_db.api_keys_json)
        except Exception:
            pass
            
    prompt = (
        f"Generate a concise bulleted summary (maximum 3-4 sentences) of the following markdown note.\n\n"
        f"--- Note Content ---\n{note.content_markdown}\n"
    )
    
    try:
        summary_text = await AIProviderService.generate_response(
            provider=provider,
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=256,
            api_keys=api_keys
        )
        
        note.summary = summary_text.strip()
        db.commit()
        db.refresh(note)
        return note
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate note summary: {str(e)}"
        )
