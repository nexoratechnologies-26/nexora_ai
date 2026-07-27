import json
import httpx
from typing import AsyncGenerator, Dict, Any, List, Optional
import openai
import google.generativeai as genai
from anthropic import AsyncAnthropic

class AIProviderService:
    @staticmethod
    async def generate_response(
        provider: str,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2048,
        api_keys: Dict[str, str] = None
    ) -> str:
        """
        Generate a non-streaming completion.
        """
        api_keys = api_keys or {}
        
        if provider == "openai":
            api_key = api_keys.get("openai") or openai.api_key
            client = openai.AsyncOpenAI(api_key=api_key)
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content or ""
            
        elif provider == "gemini":
            api_key = api_keys.get("gemini")
            if api_key:
                genai.configure(api_key=api_key)
            # Map system messages/history for gemini
            # Gemini expects history formatted with parts or simple chat interface
            model_instance = genai.GenerativeModel(model)
            # Simple conversion of system/user messages to string or prompt
            prompt = AIProviderService._format_messages_for_gemini(messages)
            response = await model_instance.generate_content_async(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens
                )
            )
            return response.text or ""
            
        elif provider == "claude":
            api_key = api_keys.get("claude")
            client = AsyncAnthropic(api_key=api_key)
            # Extract system instruction if present
            system_instruction = ""
            api_messages = []
            for msg in messages:
                if msg["role"] == "system":
                    system_instruction = msg["content"]
                else:
                    api_messages.append({"role": msg["role"], "content": msg["content"]})
                    
            response = await client.messages.create(
                model=model,
                messages=api_messages,
                system=system_instruction if system_instruction else None,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response.content[0].text or ""
            
        elif provider == "ollama":
            # Call Ollama local REST API
            ollama_host = api_keys.get("ollama_host", "http://localhost:11434")
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{ollama_host}/api/chat",
                    json={
                        "model": model,
                        "messages": messages,
                        "options": {
                            "temperature": temperature,
                            "num_predict": max_tokens
                        },
                        "stream": False
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data["message"]["content"]
        else:
            raise ValueError(f"Unknown AI Provider: {provider}")

    @staticmethod
    async def generate_response_stream(
        provider: str,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2048,
        api_keys: Dict[str, str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Generate a streaming completion yielding pieces of text.
        """
        api_keys = api_keys or {}
        
        if provider == "openai":
            api_key = api_keys.get("openai") or openai.api_key
            client = openai.AsyncOpenAI(api_key=api_key)
            stream = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True
            )
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        elif provider == "gemini":
            api_key = api_keys.get("gemini")
            if api_key:
                genai.configure(api_key=api_key)
            model_instance = genai.GenerativeModel(model)
            prompt = AIProviderService._format_messages_for_gemini(messages)
            # Gemini support async generation stream
            response_stream = await model_instance.generate_content_async(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens
                ),
                stream=True
            )
            async for chunk in response_stream:
                if chunk.text:
                    yield chunk.text
                    
        elif provider == "claude":
            api_key = api_keys.get("claude")
            client = AsyncAnthropic(api_key=api_key)
            system_instruction = ""
            api_messages = []
            for msg in messages:
                if msg["role"] == "system":
                    system_instruction = msg["content"]
                else:
                    api_messages.append({"role": msg["role"], "content": msg["content"]})
                    
            async with client.messages.stream(
                model=model,
                messages=api_messages,
                system=system_instruction if system_instruction else None,
                temperature=temperature,
                max_tokens=max_tokens
            ) as stream:
                async for text in stream.text_stream:
                    yield text
                    
        elif provider == "ollama":
            ollama_host = api_keys.get("ollama_host", "http://localhost:11434")
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{ollama_host}/api/chat",
                    json={
                        "model": model,
                        "messages": messages,
                        "options": {
                            "temperature": temperature,
                            "num_predict": max_tokens
                        },
                        "stream": True
                    }
                ) as response:
                    response.raise_for_status()
                    async for line in response.iter_lines():
                        if line:
                            data = json.loads(line)
                            content = data.get("message", {}).get("content", "")
                            if content:
                                yield content
        else:
            raise ValueError(f"Unknown AI Provider: {provider}")

    @staticmethod
    def _format_messages_for_gemini(messages: List[Dict[str, str]]) -> str:
        """
        Formats generic system/user/assistant messages into a single prompt block
        that the Gemini GenerativeModel can ingest cleanly.
        """
        formatted = []
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            if role == "system":
                formatted.append(f"Instruction: {content}")
            elif role == "user":
                formatted.append(f"User: {content}")
            else:
                formatted.append(f"Assistant: {content}")
        return "\n\n".join(formatted)
