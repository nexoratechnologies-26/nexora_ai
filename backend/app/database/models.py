import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.connection import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)  # Nullable for OAuth/Guest users
    name = Column(String(255), nullable=True)
    auth_provider = Column(String(50), default="local")  # local, google, github, guest
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("Setting", back_populates="user", uselist=False, cascade="all, delete-orphan")
    prompts = relationship("Prompt", back_populates="user", cascade="all, delete-orphan")


class Chat(Base):
    __tablename__ = "chats"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    provider = Column(String(50), nullable=False)  # openai, gemini, claude, ollama
    model = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="chats")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    chat_id = Column(String(36), ForeignKey("chats.id"), nullable=False)
    role = Column(String(50), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    chat = relationship("Chat", back_populates="messages")


class Document(Base):
    __tablename__ = "documents"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)  # pdf, docx, txt, pptx
    file_size = Column(Integer, nullable=False)     # in bytes
    file_path = Column(String(512), nullable=False) # path on local storage
    vector_collection_id = Column(String(255), nullable=True) # RAG ChromaDB collection name
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="documents")


class Note(Base):
    __tablename__ = "notes"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    content_markdown = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    folder_name = Column(String(100), default="General") # Knowledge folders
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="notes")


class Prompt(Base):
    __tablename__ = "prompts"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)  # Null if it is a built-in template
    title = Column(String(255), nullable=False)
    template = Column(Text, nullable=False)
    category = Column(String(100), nullable=False) # coding, research, study, custom, etc.
    is_custom = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="prompts")


class Setting(Base):
    __tablename__ = "settings"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    theme = Column(String(20), default="dark")  # dark, light
    font_size = Column(Integer, default=14)
    model_provider = Column(String(50), default="openai")
    model_name = Column(String(100), default="gpt-4o")
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=2048)
    clipboard_monitoring_enabled = Column(Boolean, default=False)
    voice_enabled = Column(Boolean, default=False)
    api_keys_json = Column(Text, default="{}") # Encrypted or plain text JSON config for local setup
    
    # Relationships
    user = relationship("User", back_populates="settings")
