import os
import json
import re
import httpx
from typing import AsyncGenerator, Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()

# ==============================================================================
# Centralized Generic LLM Configuration Resolver
# Prioritizes generic LLM_* keys, with fallbacks to OPENROUTER_* and OPENAI_*
# ==============================================================================
def get_llm_api_key() -> str:
    return (
        os.getenv("LLM_API_KEY") or
        ""
    ).strip()

def get_llm_base_url() -> str:
    base = (
        os.getenv("LLM_BASE_URL") or ""
    ).strip().rstrip("/")
    return base

def get_llm_default_model() -> str:
    return (
        os.getenv("LLM_MODEL") or
        ""
    ).strip()


class GenericLLMProvider:
    """
    Centralized, generic LLM Client for the entire Sathyanantham AI Studio platform.
    Uses standard OpenAI-compatible completions format, seamlessly supporting:
    - OpenRouter API (Default)
    - OpenAI Direct API
    - Groq, Ollama, LMStudio, vLLM, or any custom LLM Gateway.
    """

    def __init__(self, model: Optional[str] = None, base_url: Optional[str] = None, api_key: Optional[str] = None):
        self.api_key = api_key or get_llm_api_key()
        self.base_url = (base_url or get_llm_base_url()).rstrip("/")
        
        default_model = get_llm_default_model()
        chosen = (model or default_model).strip()
        
        # When using NVIDIA integrate API, sanitize model name and clean legacy suffixes
        if "nvidia.com" in self.base_url:
            clean_model = chosen.replace(":free", "").strip()
            if not clean_model or "ultra-550b" in clean_model:
                clean_model = default_model
            self.model = clean_model
        else:
            self.model = chosen

    def get_chat_completions_url(self) -> str:
        if self.base_url.endswith("/chat/completions"):
            return self.base_url
        return f"{self.base_url}/chat/completions"

    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        stream: bool = True,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        timeout: float = 15.0
    ) -> AsyncGenerator[str, None]:
        """
        Streams or yields completion tokens from the configured LLM endpoint.
        """
        if not self.api_key:
            yield "Mock AI Twin Mode: LLM API key not detected. Sathyanantham V is a Lead Software Engineer & Frontend Architect with 13+ years of experience."
            return

        url = self.get_chat_completions_url()
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://sathya-ai-studio.lovable.app",
            "X-Title": "Sathyanantham AI Studio",
            "Content-Type": "application/json"
        }

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": stream,
            "temperature": temperature
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens

        timeout_config = httpx.Timeout(timeout, connect=8.0)
        models_to_try = [self.model]
        if "nvidia.com" in self.base_url:
            for candidate in ["nvidia/nemotron-3-nano-30b-a3b", "nvidia/nemotron-3-super-120b-a12b"]:
                if candidate not in models_to_try:
                    models_to_try.append(candidate)

        for candidate_model in models_to_try:
            payload["model"] = candidate_model
            chunks_yielded = 0
            if not stream:
                try:
                    async with httpx.AsyncClient(timeout=timeout_config) as client:
                        res = await client.post(url, headers=headers, json=payload)
                        res.raise_for_status()
                        data = res.json()
                        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                        if content:
                            self.model = candidate_model
                            yield content
                            return
                except Exception as err:
                    print(f"[LLM_PROVIDER] Non-streaming error with {candidate_model}: {err}")
                    continue
            else:
                try:
                    async with httpx.AsyncClient(timeout=timeout_config) as client:
                        async with client.stream("POST", url, headers=headers, json=payload) as response:
                            response.raise_for_status()
                            async for line in response.aiter_lines():
                                if line.startswith("data: "):
                                    data_str = line[6:].strip()
                                    if data_str == "[DONE]":
                                        break
                                    try:
                                        chunk_json = json.loads(data_str)
                                        content_chunk = chunk_json.get("choices", [{}])[0].get("delta", {}).get("content", "")
                                        if content_chunk:
                                            if chunks_yielded == 0:
                                                self.model = candidate_model
                                            chunks_yielded += 1
                                            yield content_chunk
                                    except Exception:
                                        pass
                            if chunks_yielded > 0:
                                return
                except Exception as err:
                    print(f"[LLM_PROVIDER] Streaming error with {candidate_model}: {err}")
                    if chunks_yielded > 0:
                        return
                    continue

    async def generate_json(
        self,
        messages: List[Dict[str, str]],
        fallback: Optional[Dict[str, Any]] = None,
        temperature: float = 0.2,
        timeout: float = 8.0
    ) -> Dict[str, Any]:
        """
        Executes a non-streaming LLM prompt and reliably parses the returned JSON.
        """
        full_text = ""
        try:
            async for chunk in self.chat_completion(messages, stream=False, temperature=temperature, timeout=timeout):
                full_text += chunk
            
            # Robust JSON extraction via regex
            match = re.search(r'(\{[\s\S]*\}|\[[\s\S]*\])', full_text)
            if match:
                return json.loads(match.group(0))
        except Exception as e:
            print(f"[LLM_PROVIDER] Error generating JSON with model {self.model}: {e}")

        return fallback if fallback is not None else {}


# ==============================================================================
# Aliases & Global Singleton Instance for unified import across all services
# ==============================================================================
LLMProvider = GenericLLMProvider
OpenRouterAIProvider = GenericLLMProvider  # Backward compatibility alias

llm_provider = GenericLLMProvider()

