import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

# Add parent path to import app correctly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database.connection import Base, get_db
from app.database.models import User, Setting

# Set up test database in-memory
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_temp.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    # Clean up test database file
    if os.path.exists("./test_temp.db"):
        try:
            os.remove("./test_temp.db")
        except Exception:
            pass

def test_signup():
    response = client.post(
        "/api/v1/auth/signup",
        json={"email": "test@nexora.ai", "password": "securepassword123", "name": "Tester"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@nexora.ai"
    assert data["name"] == "Tester"
    assert "id" in data

def test_login():
    # Sign up
    client.post(
        "/api/v1/auth/signup",
        json={"email": "login@nexora.ai", "password": "password123", "name": "Tester"}
    )
    
    # Login
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "login@nexora.ai", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_guest_mode():
    response = client.post("/api/v1/auth/guest")
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["auth_provider"] == "guest"

def test_get_settings():
    # Guest Login to get token
    login_res = client.post("/api/v1/auth/guest")
    token = login_res.json()["access_token"]
    
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/settings", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "theme" in data
    assert data["theme"] == "dark"
    assert "model_provider" in data
