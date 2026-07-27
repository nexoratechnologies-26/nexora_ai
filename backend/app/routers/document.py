from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
import json

from app.database.connection import get_db
from app.database.models import User, Document, Setting
from app.routers.auth import get_current_user
from app.schemas import DocumentResponse
from app.services.rag_service import RAGService
from app.services.ai_provider import AIProviderService

router = APIRouter(prefix="/documents", tags=["Document Intelligence"])
rag_service = RAGService()

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify file extension
    filename = file.filename
    _, ext = os.path.splitext(filename.lower())
    clean_ext = ext.replace(".", "")
    
    if clean_ext not in ["pdf", "docx", "txt", "pptx"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload PDF, DOCX, TXT, or PPTX."
        )
        
    # Save file locally
    user_upload_dir = os.path.join(os.getcwd(), "nexora_data", "uploads", current_user.id)
    os.makedirs(user_upload_dir, exist_ok=True)
    
    file_path = os.path.join(user_upload_dir, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    file_size = os.path.getsize(file_path)
    
    # Create DB entry
    db_doc = Document(
        user_id=current_user.id,
        filename=filename,
        file_type=clean_ext,
        file_size=file_size,
        file_path=file_path
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    
    # Load API keys for embeddings (if any)
    settings_db = db.query(Setting).filter(Setting.user_id == current_user.id).first()
    api_keys = {}
    if settings_db and settings_db.api_keys_json:
        try:
            api_keys = json.loads(settings_db.api_keys_json)
        except Exception:
            pass
            
    # Index in ChromaDB Vector Storage
    try:
        vector_collection_id = await rag_service.ingest_document(
            document_id=db_doc.id,
            user_id=current_user.id,
            file_path=file_path,
            file_type=clean_ext,
            api_keys=api_keys
        )
        db_doc.vector_collection_id = vector_collection_id
        db.commit()
        db.refresh(db_doc)
    except Exception as e:
        # Cleanup file & DB entry if vector indexing fails
        if os.path.exists(file_path):
            os.remove(file_path)
        db.delete(db_doc)
        db.commit()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to vector index document: {str(e)}"
        )
        
    return db_doc

@router.get("", response_model=List[DocumentResponse])
def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Document).filter(Document.user_id == current_user.id).order_by(Document.created_at.desc()).all()

@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Delete from local filesystem
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass
            
    # Delete from ChromaDB
    await rag_service.delete_document(document_id=doc.id, user_id=current_user.id)
    
    # Delete from SQLite
    db.delete(doc)
    db.commit()
    return {"status": "success", "message": "Document deleted successfully"}

@router.post("/{document_id}/flashcards")
async def generate_flashcards(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Read part of the document text
    try:
        text = rag_service.extract_text_from_file(doc.file_path, doc.file_type)
        # Limit context to avoid hitting token limits
        context = text[:6000]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read document content: {str(e)}")
        
    # Get active settings
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
        f"You are a study helper. Read the following text extracted from the document '{doc.filename}' "
        f"and generate a list of 5-8 educational study flashcards in valid JSON array format. "
        f"Each flashcard MUST be an object with 'question' and 'answer' fields.\n\n"
        f"--- Extracted Text ---\n{context}\n\n"
        f"Respond ONLY with the JSON array, no explanation or markdown wrapper."
    )
    
    try:
        response = await AIProviderService.generate_response(
            provider=provider,
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=1000,
            api_keys=api_keys
        )
        
        # Clean JSON wrappers if LLM returned them
        cleaned_response = response.strip()
        if cleaned_response.startswith("```json"):
            cleaned_response = cleaned_response.split("```json")[1]
        if cleaned_response.endswith("```"):
            cleaned_response = cleaned_response.rsplit("```", 1)[0]
            
        flashcards = json.loads(cleaned_response.strip())
        return {"flashcards": flashcards}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate flashcards: {str(e)}"
        )
