import os
from typing import Dict, Any, Optional
from gtts import gTTS
import speech_recognition as sr
from app.core.config import settings

class VoiceService:
    @staticmethod
    async def speech_to_text(
        audio_file_path: str,
        api_keys: Dict[str, str] = None
    ) -> str:
        """
        Transcribe audio recording to text.
        Uses OpenAI Whisper if key exists, otherwise falls back to SpeechRecognition.
        """
        api_keys = api_keys or {}
        openai_key = api_keys.get("openai") or settings.OPENAI_API_KEY
        
        # 1. Try OpenAI Whisper if key is present
        if openai_key:
            try:
                import openai
                client = openai.OpenAI(api_key=openai_key)
                with open(audio_file_path, "rb") as audio:
                    transcript = client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio
                    )
                    return transcript.text or ""
            except Exception:
                pass # Fallback

        # 2. Local/Free Fallback: SpeechRecognition using Sphinx or Google's web API
        try:
            r = sr.Recognizer()
            with sr.AudioFile(audio_file_path) as source:
                audio_data = r.record(source)
                # Try google web speech API (free, built into speech_recognition)
                text = r.recognize_google(audio_data)
                return text
        except sr.UnknownValueError:
            return "[Unable to recognize speech]"
        except sr.RequestError as e:
            return f"[Speech Recognition Service Error: {e}]"
        except Exception as e:
            return f"[Error transcribing audio: {str(e)}]"

    @staticmethod
    async def text_to_speech(
        text: str,
        output_file_path: str,
        api_keys: Dict[str, str] = None
    ) -> str:
        """
        Convert text to speech audio.
        Uses OpenAI TTS if key exists, otherwise falls back to gTTS.
        """
        api_keys = api_keys or {}
        openai_key = api_keys.get("openai") or settings.OPENAI_API_KEY
        
        # 1. Try OpenAI TTS if key is present
        if openai_key:
            try:
                import openai
                client = openai.OpenAI(api_key=openai_key)
                response = client.audio.speech.create(
                    model="tts-1",
                    voice="alloy",
                    input=text
                )
                response.stream_to_file(output_file_path)
                return output_file_path
            except Exception:
                pass # Fallback

        # 2. Local/Free Fallback using Google Text-to-Speech (gTTS)
        try:
            tts = gTTS(text=text, lang='en')
            tts.save(output_file_path)
            return output_file_path
        except Exception as e:
            # Create an empty file or dummy file
            with open(output_file_path, "wb") as f:
                f.write(b"")
            raise RuntimeError(f"Failed to generate text-to-speech: {str(e)}")
stream_to_file = None
