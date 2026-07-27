from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database.connection import get_db
from app.database.models import User, Prompt
from app.routers.auth import get_current_user
from app.schemas import PromptResponse, PromptCreate

router = APIRouter(prefix="/prompts", tags=["Prompt Library"])

BUILT_IN_PROMPTS = [
    {
        "id": "builtin-coding-refactor",
        "title": "Code Refactorer",
        "template": "Refactor the following code to improve performance, readability, and adhere to best practices. Add comments explaining each change:\n\n```\n[INSERT CODE HERE]\n```",
        "category": "Coding",
        "is_custom": False
    },
    {
        "id": "builtin-research-summarize",
        "title": "Research Summarizer",
        "template": "Analyze the following research abstract or paper section. Highlight the primary contributions, methodology, findings, and limitations in bullet points:\n\n[INSERT TEXT HERE]",
        "category": "Research",
        "is_custom": False
    },
    {
        "id": "builtin-study-explain-like-five",
        "title": "Explain Like I'm 5",
        "template": "Explain the following scientific or technical concept like I am a 5-year-old. Use creative analogies and simple language:\n\n[INSERT CONCEPT HERE]",
        "category": "Study",
        "is_custom": False
    },
    {
        "id": "builtin-resume-review",
        "title": "Resume Reviewer",
        "template": "Act as an expert technical recruiter. Review the following resume section. Provide detailed suggestions for improvements, better action verbs, and structural alignment:\n\n[INSERT RESUME CONTENT HERE]",
        "category": "Resume",
        "is_custom": False
    },
    {
        "id": "builtin-email-writer",
        "title": "Professional Email Drafter",
        "template": "Write a professional, clear, and polite email based on the following key points, setting a warm but professional tone:\n\n- Key points: [INSERT POINTS HERE]",
        "category": "Email",
        "is_custom": False
    },
    {
        "id": "builtin-translator",
        "title": "Contextual Translator",
        "template": "Translate the following text to [INSERT TARGET LANGUAGE] while preserving original tone, idioms, and context:\n\n\"[INSERT TEXT HERE]\"",
        "category": "Translation",
        "is_custom": False
    },
    {
        "id": "builtin-bug-fixer",
        "title": "Bug Fixer & Analyzer",
        "template": "Analyze the following code block for bugs, race conditions, memory leaks, or logical issues. Provide a detailed fix and explain what caused the bug:\n\n```\n[INSERT CODE HERE]\n```",
        "category": "Coding",
        "is_custom": False
    }
]

@router.get("", response_model=List[PromptResponse])
def list_prompts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Retrieve user's custom prompts
    custom_prompts = db.query(Prompt).filter(Prompt.user_id == current_user.id).order_by(Prompt.created_at.desc()).all()
    
    # Merge custom prompts with system built-in prompts
    all_prompts = []
    # Convert built-in prompts to match schema format
    from datetime import datetime
    for bp in BUILT_IN_PROMPTS:
        all_prompts.append(Prompt(
            id=bp["id"],
            title=bp["title"],
            template=bp["template"],
            category=bp["category"],
            is_custom=bp["is_custom"],
            created_at=datetime.utcnow()
        ))
        
    all_prompts.extend(custom_prompts)
    return all_prompts

@router.post("", response_model=PromptResponse)
def create_custom_prompt(
    prompt_in: PromptCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_prompt = Prompt(
        user_id=current_user.id,
        title=prompt_in.title,
        template=prompt_in.template,
        category=prompt_in.category,
        is_custom=True
    )
    db.add(db_prompt)
    db.commit()
    db.refresh(db_prompt)
    return db_prompt

@router.delete("/{prompt_id}")
def delete_custom_prompt(
    prompt_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Built-in prompts cannot be deleted
    if prompt_id.startswith("builtin-"):
        raise HTTPException(status_code=403, detail="Cannot delete built-in system prompts")
        
    db_prompt = db.query(Prompt).filter(Prompt.id == prompt_id, Prompt.user_id == current_user.id).first()
    if not db_prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
        
    db.delete(db_prompt)
    db.commit()
    return {"status": "success", "message": "Custom prompt deleted"}
