import os
import json
import httpx
import asyncio
from typing import List, Dict, Any, AsyncGenerator
from dotenv import load_dotenv
from app.rag.ingestion import kb
from app.ai.tools import ALL_TOOLS, execute_tool_call

# Load environment variables
load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
DEFAULT_MODEL = os.getenv("OPENROUTER_API_MODEL", "anthropic/claude-3.5-sonnet")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1/chat/completions")

class OpenRouterAIProvider:
    def __init__(self, api_key: str = None, model: str = None):
        self.api_key = api_key or OPENROUTER_API_KEY
        self.model = DEFAULT_MODEL

    async def chat_completion(self, messages: List[Dict[str, str]], stream: bool = True) -> AsyncGenerator[str, None]:
        # Extract last user message to retrieve context
        last_user_msg = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
        system_prompt = kb.build_system_prompt(last_user_msg)

        full_messages = [{"role": "system", "content": system_prompt}] + messages

        # Fallback generator if no OpenRouter API key is provided
        if not self.api_key:
            yield f"[Mock Mode - {self.model}]\n\n"
            retrieved = kb.retrieve_context(last_user_msg, top_k=2)
            mock_reply = (
                f"Hello! As Sathyanantham V's AI Digital Twin, I'm glad to answer your question regarding **{last_user_msg or 'my experience'}**.\n\n"
                f"Sathyanantham is a Lead Software Engineer and Frontend Architect with over **13+ years** of experience in building scalable e-commerce, banking, and AI-enabled platforms (including Nextuple OMS, Bayer 30+ sites, and Kohls Mobile).\n\n"
                f"**Retrieved Context Highlights:**\n"
            )
            for r in retrieved:
                mock_reply += f"- **{r['section']}**: {r['content'][:150]}...\n"
            mock_reply += "\nFeel free to leave your contact email if you'd like Sathyanantham to reach out to you directly!"

            for word in mock_reply.split(" "):
                yield word + " "
            return

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://sathyanantham.ai",
            "X-Title": "Sathyanantham V Portfolio AI Studio"
        }

        # We execute a non-streaming call first to check for tool calls.
        # This resolves the issue of tool calls not being caught during streaming.
        payload = {
            "model": self.model,
            "messages": full_messages,
            "tools": ALL_TOOLS,
            "stream": False
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                res = await client.post(OPENROUTER_BASE_URL, headers=headers, json=payload)
                if res.status_code != 200:
                    raise ValueError(f"Status {res.status_code}: {res.text}")
                data = res.json()
                choice = data["choices"][0]
                message = choice["message"]

                # 1. Check if LLM wanted to call a Tool
                if message.get("tool_calls"):
                    tool_messages = []
                    for tc in message["tool_calls"]:
                        t_name = tc["function"]["name"]
                        t_args = json.loads(tc["function"]["arguments"])
                        tool_res = execute_tool_call(t_name, t_args)
                        
                        yield f"\n\n*[Executed Action: {t_name}]*: {tool_res.get('message')}\n\n"
                        
                        # Add tool call and response to chat history
                        tool_messages.append({
                            "role": "tool",
                            "name": t_name,
                            "content": json.dumps(tool_res),
                            "tool_call_id": tc.get("id", f"call_{t_name}_{t_args.get('email', '123')}")
                        })
                    
                    # Call again to get final dynamic response from LLM, streaming if requested
                    payload_final = {
                        "model": self.model,
                        "messages": full_messages + [message] + tool_messages,
                        "stream": stream
                    }
                    
                    if not stream:
                        res2 = await client.post(OPENROUTER_BASE_URL, headers=headers, json=payload_final)
                        if res2.status_code == 200:
                            data2 = res2.json()
                            yield data2["choices"][0]["message"].get("content", "")
                    else:
                        async with client.stream("POST", OPENROUTER_BASE_URL, headers=headers, json=payload_final) as response:
                            if response.status_code == 200:
                                async for line in response.aiter_lines():
                                    if line.startswith("data: "):
                                        content_str = line[6:].strip()
                                        if content_str == "[DONE]":
                                            break
                                        try:
                                            chunk = json.loads(content_str)
                                            delta = chunk["choices"][0]["delta"]
                                            if "content" in delta and delta["content"]:
                                                yield delta["content"]
                                        except Exception:
                                            pass

                # 2. No Tool was called. We already have the full LLM reply content!
                # We can stream-simulate this response for a smoother UI typing animation.
                else:
                    content = message.get("content", "")
                    if stream and content:
                        words = content.split(" ")
                        for word in words:
                            yield word + " "
                            await asyncio.sleep(0.015)
                    else:
                        yield content or "I apologize, I didn't receive a response."

            except Exception as e:
                print(f"Error calling OpenRouter: {e}")
                if "401" in str(e) or "Unauthorized" in str(e) or "User not found" in str(e):
                    print("\n" + "="*80)
                    print("CRITICAL WARNING: The OPENROUTER_API_KEY in your .env is invalid, unauthorized, or expired!")
                    print("Please generate a valid API key from https://openrouter.ai/keys and update your .env file.")
                    print("="*80 + "\n")
                yield f"*[Offline Twin Mode]* \n\n"
                retrieved = kb.retrieve_context(last_user_msg, top_k=2)
                mock_reply = (
                    f"Hello! As Sathyanantham V's AI Digital Twin, I'm glad to answer your question regarding **{last_user_msg or 'my experience'}**.\n\n"
                    f"Sathyanantham is a Lead Software Engineer and Frontend Architect with over **13+ years** of experience in building scalable e-commerce, banking, and AI-enabled platforms (including Nextuple OMS, Bayer 30+ sites, and Kohls Mobile).\n\n"
                    f"**Retrieved Context Highlights:**\n"
                )
                for r in retrieved:
                    mock_reply += f"- **{r['section']}**: {r['content'][:150]}...\n"
                mock_reply += "\nFeel free to leave your contact email if you'd like Sathyanantham to reach out to you directly!"
                for word in mock_reply.split(" "):
                    yield word + " "
                    await asyncio.sleep(0.01)

ai_provider = OpenRouterAIProvider()
