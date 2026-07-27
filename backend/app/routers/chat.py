from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import json
import asyncio

from app.database.connection import get_db
from app.database.models import User, Chat, Message, Setting
from app.routers.auth import get_current_user
from app.schemas import ChatResponse, ChatCreate, MessageResponse, MessageCreate
from app.services.ai_provider import AIProviderService
from app.services.rag_service import RAGService

router = APIRouter(prefix="/chat", tags=["AI Chat"])
rag_service = RAGService()

@router.get("/chats", response_model=List[ChatResponse])
def get_user_chats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    chats = db.query(Chat).filter(Chat.user_id == current_user.id).order_index = Chat.created_at.desc()
    return db.query(Chat).filter(Chat.user_id == current_user.id).order_by(Chat.created_at.desc()).all()

@router.post("/chats", response_model=ChatResponse)
def create_chat(
    chat_in: ChatCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    chat = Chat(
        user_id=current_user.id,
        title=chat_in.title,
        provider=chat_in.provider,
        model=chat_in.model
    )
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat

@router.get("/chats/{chat_id}", response_model=ChatResponse)
def get_chat(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat

@router.delete("/chats/{chat_id}")
def delete_chat(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    db.delete(chat)
    db.commit()
    return {"status": "success", "message": "Chat deleted"}

# --- SSE Streaming Response ---
@router.post("/chats/{chat_id}/stream")
async def stream_chat_response(
    chat_id: str,
    message_in: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify chat ownership
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    # Fetch User Settings and API keys
    settings_db = db.query(Setting).filter(Setting.user_id == current_user.id).first()
    api_keys = {}
    if settings_db and settings_db.api_keys_json:
        try:
            api_keys = json.loads(settings_db.api_keys_json)
        except Exception:
            pass
            
    # Save the user's message
    user_msg = Message(
        chat_id=chat_id,
        role="user",
        content=message_in.content
    )
    db.add(user_msg)
    
    # Update chat timestamp
    chat.title = chat.title if chat.title != "New Conversation" else message_in.content[:40]
    db.commit()
    
    # Retrieve chat history
    db_messages = db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at.asc()).all()
    history = []
    
    # Check if there is a document in RAG query context.
    # If the user asks something, query RAG chunks and prepend to the prompt.
    rag_chunks = []
    if "doc:" in message_in.content.lower() or any(term in message_in.content.lower() for term in ["document", "pdf", "file", "summarize"]):
        # Extract RAG relevance chunks for prompt augmentation
        clean_query = message_in.content
        for term in ["doc:", "document", "pdf", "file"]:
            clean_query = clean_query.replace(term, "")
        rag_chunks = await rag_service.query_relevant_chunks(
            user_id=current_user.id,
            query=clean_query.strip(),
            limit=4,
            api_keys=api_keys
        )

    if rag_chunks:
        context_str = "\n".join([f"Source Chunk: {c['text']}" for c in rag_chunks])
        system_instructions = (
            f"You are Nexora AI Copilot. Synthesize answers based on the provided context below.\n\n"
            f"--- Context ---\n{context_str}\n--- End Context ---\n\n"
            f"Use the context to answer the user's request. Maintain code formatting and markdown details."
        )
        history.append({"role": "system", "content": system_instructions})
    else:
        history.append({"role": "system", "content": "You are Nexora AI, a premium intelligent desktop copilot assistant. Provide helpful, accurate, markdown-formatted answers."})

    for msg in db_messages:
        # Avoid duplication of the prompt with context
        if msg.id == user_msg.id and rag_chunks:
            # We already prepended context, so keep user's original query here
            history.append({"role": msg.role, "content": msg.content})
        else:
            history.append({"role": msg.role, "content": msg.content})

    async def event_generator():
        collected_chunks = []
        try:
            generator = AIProviderService.generate_response_stream(
                provider=chat.provider,
                model=chat.model,
                messages=history,
                temperature=settings_db.temperature if settings_db else 0.7,
                max_tokens=settings_db.max_tokens if settings_db else 2048,
                api_keys=api_keys
            )
            async for token in generator:
                collected_chunks.append(token)
                # Yield SSE data format
                yield f"data: {json.dumps({'text': token})}\n\n"
                await asyncio.sleep(0.01)
                
            # Write final assistant response to DB
            full_response = "".join(collected_chunks)
            if full_response.strip():
                assistant_msg = Message(
                    chat_id=chat_id,
                    role="assistant",
                    content=full_response
                )
                # We need a new session in thread safe way or write immediately
                # Because event_generator runs in async context, let's write to db:
                db.add(assistant_msg)
                db.commit()
                
            yield f"data: [DONE]\n\n"
        except Exception as e:
            err_msg = f"Error generating text: {str(e)}"
            yield f"data: {json.dumps({'error': err_msg})}\n\n"
            yield f"data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# --- WebSocket Chat Streaming Connection ---
@router.websocket("/ws/{chat_id}")
async def websocket_chat_endpoint(websocket: WebSocket, chat_id: str):
    await websocket.accept()
    db = next(get_db())
    
    try:
        chat = db.query(Chat).filter(Chat.id == chat_id).first()
        if not chat:
            await websocket.send_json({"error": "Chat not found"})
            await websocket.close()
            return
            
        settings_db = db.query(Setting).filter(Setting.user_id == chat.user_id).first()
        api_keys = {}
        if settings_db and settings_db.api_keys_json:
            api_keys = json.loads(settings_db.api_keys_json)
            
        while True:
            # Receive user query in JSON
            data = await websocket.receive_text()
            message_data = json.loads(data)
            query = message_data.get("content", "")
            
            if not query:
                continue
                
            # Save user message
            user_msg = Message(chat_id=chat_id, role="user", content=query)
            db.add(user_msg)
            db.commit()
            
            # Fetch message history
            db_messages = db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at.asc()).all()
            history = [{"role": "system", "content": "You are Nexora AI Copilot."}]
            for msg in db_messages:
                history.append({"role": msg.role, "content": msg.content})
                
            # Stream response back via WebSocket
            collected = []
            try:
                generator = AIProviderService.generate_response_stream(
                    provider=chat.provider,
                    model=chat.model,
                    messages=history,
                    temperature=settings_db.temperature if settings_db else 0.7,
                    max_tokens=settings_db.max_tokens if settings_db else 2048,
                    api_keys=api_keys
                )
                async for token in generator:
                    collected.append(token)
                    await websocket.send_json({"token": token})
                    
                # Save assistant response
                full_reply = "".join(collected)
                if full_reply.strip():
                    assistant_msg = Message(chat_id=chat_id, role="assistant", content=full_reply)
                    db.add(assistant_msg)
                    db.commit()
                    
                await websocket.send_json({"done": True, "full_text": full_reply})
            except Exception as e:
                await websocket.send_json({"error": str(e)})
                
    except WebSocketDisconnect:
        pass
    finally:
        db.close()
