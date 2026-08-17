import os
import json
import httpx
from typing import AsyncGenerator, Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", os.getenv("NEXT_PUBLIC_OPENROUTER_API_KEY", ""))
DEFAULT_MODEL = os.getenv("OPENROUTER_API_MODEL", "anthropic/claude-3.5-sonnet")

class OpenRouterAIProvider:
    def __init__(self, model: Optional[str] = None):
        self.api_key = OPENROUTER_API_KEY
        self.model = model or DEFAULT_MODEL

    async def chat_completion(self, messages: List[Dict[str, str]], stream: bool = True) -> AsyncGenerator[str, None]:
        if not self.api_key:
            yield "Mock AI Twin Mode: OpenRouter API key not detected. Sathyanantham V is a Frontend Architect with 13+ years of experience."
            return

        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://sathya-ai-studio.lovable.app",
            "X-Title": "Sathyanantham AI Studio",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": stream,
            "temperature": 0.7
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            if not stream:
                res = await client.post(url, headers=headers, json=payload)
                data = res.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                yield content
            else:
                async with client.stream("POST", url, headers=headers, json=payload) as response:
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:].strip()
                            if data_str == "[DONE]":
                                break
                            try:
                                chunk_json = json.loads(data_str)
                                content_chunk = chunk_json.get("choices", [{}])[0].get("delta", {}).get("content", "")
                                if content_chunk:
                                    yield content_chunk
                            except Exception:
                                pass
