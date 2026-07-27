from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from datetime import datetime
import json

from app.database.connection import get_db
from app.database.models import User, Setting, Note, Prompt
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.config import settings
from app.schemas import UserCreate, UserResponse, LoginRequest, Token

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login-form-dummy")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/signup", response_model=UserResponse)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if email exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email address already exists."
        )
        
    hashed_pwd = get_password_hash(user_in.password) if user_in.password else None
    
    # Create user
    db_user = User(
        email=user_in.email,
        password_hash=hashed_pwd,
        name=user_in.name or user_in.email.split("@")[0],
        auth_provider=user_in.auth_provider
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create default settings
    default_settings = Setting(
        user_id=db_user.id,
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
    db.add(default_settings)
    
    # Add seed built-in templates / prompts for custom coding & research helper
    welcome_note = Note(
        user_id=db_user.id,
        title="Welcome to Nexora AI 🚀",
        content_markdown=(
            "# Getting Started with Nexora AI\n\n"
            "Welcome! Nexora AI is your local-first intelligent copilot.\n\n"
            "### Core Capabilities:\n"
            "1. **AI Chat**: Standard GPT style messaging.\n"
            "2. **Screenshot Analyzer**: Crop or capture images and get visual details.\n"
            "3. **Document Intelligence**: Upload PDF/DOCX and ask questions using local/remote RAG.\n"
            "4. **Notes**: Compile thoughts, code highlights, and summarize folders.\n"
            "5. **Offline Support**: Connect a local Ollama instance in Settings to work completely offline!\n"
        ),
        folder_name="General"
    )
    db.add(welcome_note)
    
    db.commit()
    return db_user

@router.post("/login", response_model=Token)
def login(login_req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_req.email).first()
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=400,
            detail="Incorrect email or password"
        )
        
    if not verify_password(login_req.password, user.password_hash):
        raise HTTPException(
            status_code=400,
            detail="Incorrect email or password"
        )
        
    access_token = create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/guest", response_model=Token)
def guest_login(db: Session = Depends(get_db)):
    # Guest user credentials
    guest_email = f"guest_{datetime.now().strftime('%Y%m%d%H%M%S')}@nexora.ai"
    db_user = User(
        email=guest_email,
        name="Guest User",
        auth_provider="guest"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Default settings for guest
    default_settings = Setting(
        user_id=db_user.id,
        theme="dark",
        model_provider="ollama", # Default to local/ollama for offline guest
        model_name="llama3",
        api_keys_json=json.dumps({
            "openai": "",
            "gemini": "",
            "claude": "",
            "ollama_host": "http://localhost:11434"
        })
    )
    db.add(default_settings)
    db.commit()
    
    access_token = create_access_token(subject=db_user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
