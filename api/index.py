import sys
import os

# Add the backend directory to the Python path so app modules can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app

# Export the FastAPI instance for Vercel Serverless Functions
__all__ = ["app"]
