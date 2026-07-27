from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Auth Schemas ---
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None
    auth_provider: str = "local"

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    name: Optional[str] = None
    auth_provider: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# --- Message & Chat Schemas ---
class MessageCreate(BaseModel):
    role: str # user, assistant, system
    content: str

class MessageResponse(BaseModel):
    id: str
    chat_id: str
    role: str
    content: str
    tokens_used: int
    created_at: datetime

    class Config:
        from_attributes = True

class ChatCreate(BaseModel):
    title: str
    provider: str
    model: str

class ChatResponse(BaseModel):
    id: str
    user_id: str
    title: str
    provider: str
    model: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True

# --- Document Schemas ---
class DocumentResponse(BaseModel):
    id: str
    user_id: str
    filename: str
    file_type: str
    file_size: int
    vector_collection_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DocumentQueryRequest(BaseModel):
    query: str
    limit: Optional[int] = 5

class DocumentQueryResponse(BaseModel):
    chunk_id: str
    text: str
    score: float
    metadata: Dict[str, Any]

# --- Notes Schemas ---
class NoteCreate(BaseModel):
    title: str
    content_markdown: str
    folder_name: Optional[str] = "General"

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content_markdown: Optional[str] = None
    summary: Optional[str] = None
    folder_name: Optional[str] = None

class NoteResponse(BaseModel):
    id: str
    user_id: str
    title: str
    content_markdown: str
    summary: Optional[str] = None
    folder_name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Prompts Schemas ---
class PromptCreate(BaseModel):
    title: str
    template: str
    category: str

class PromptResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    title: str
    template: str
    category: str
    is_custom: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Settings Schemas ---
class SettingUpdate(BaseModel):
    theme: Optional[str] = None
    font_size: Optional[int] = None
    model_provider: Optional[str] = None
    model_name: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    clipboard_monitoring_enabled: Optional[bool] = None
    voice_enabled: Optional[bool] = None
    api_keys_json: Optional[str] = None # JSON string representing api keys

class SettingResponse(BaseModel):
    theme: str
    font_size: int
    model_provider: str
    model_name: str
    temperature: float
    max_tokens: int
    clipboard_monitoring_enabled: bool
    voice_enabled: bool
    api_keys_json: str

    class Config:
        from_attributes = True

# --- Dashboard Widgets Overview Schema ---
class DashboardOverview(BaseModel):
    recent_chats: List[Dict[str, Any]]
    recent_documents: List[DocumentResponse]
    recent_notes: List[NoteResponse]
    ai_usage_stats: Dict[str, Any] # tokens used per provider, chat counts, document count
    favorite_prompts: List[PromptResponse]
