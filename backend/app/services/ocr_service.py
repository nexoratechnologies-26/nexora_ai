import os
import base64
from typing import Dict, Any, Optional
from PIL import Image
import io
from app.core.config import settings

class OCRService:
    @staticmethod
    async def analyze_image(
        image_path: str,
        prompt: str = "Perform OCR on this image and explain any charts, diagrams, or UI components. Return clean formatted markdown.",
        api_keys: Dict[str, str] = None
    ) -> str:
        """
        Analyze screenshot/image using vision models (Gemini, OpenAI) if keys exist,
        falling back to local mockup extraction details if offline.
        """
        api_keys = api_keys or {}
        
        # Determine image format/mime type
        _, ext = os.path.splitext(image_path.lower())
        mime_type = "image/png" if ext == ".png" else "image/jpeg"
        
        # 1. Try Gemini Vision if configured
        gemini_key = api_keys.get("gemini") or settings.GEMINI_API_KEY
        if gemini_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=gemini_key)
                
                # Load image for Gemini API
                img = Image.open(image_path)
                
                # Gemini 1.5 Flash is standard for fast vision tasks
                model = genai.GenerativeModel("gemini-1.5-flash")
                response = await model.generate_content_async([prompt, img])
                return response.text or ""
            except Exception as e:
                # Fallback to next provider
                pass

        # 2. Try OpenAI Vision if configured
        openai_key = api_keys.get("openai") or settings.OPENAI_API_KEY
        if openai_key:
            try:
                import openai
                client = openai.AsyncOpenAI(api_key=openai_key)
                
                # Read image and convert to base64
                with open(image_path, "rb") as image_file:
                    base64_image = base64.b64encode(image_file.read()).decode('utf-8')
                
                response = await client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{mime_type};base64,{base64_image}"
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens=1024
                )
                return response.choices[0].message.content or ""
            except Exception as e:
                pass

        # 3. Local Offline Fallback: Extract image details, shape, and mock text.
        # This keeps the desktop application from throwing errors when offline.
        try:
            with Image.open(image_path) as img:
                w, h = img.size
                format_name = img.format
                mode = img.mode
            
            return (
                f"### Offline Image Analysis Fallback\n\n"
                f"* **File Path:** `{os.path.basename(image_path)}`\n"
                f"* **Dimensions:** {w}x{h} pixels\n"
                f"* **Format:** {format_name} ({mode})\n\n"
                f"> [!WARNING]\n"
                f"> System is running in **offline mode** or **API keys are missing**.\n"
                f"> To get rich AI layout analysis, diagram explanation, or OCR, please configure an OpenAI/Gemini API key in Settings."
            )
        except Exception as e:
            return f"Error opening image: {str(e)}"
