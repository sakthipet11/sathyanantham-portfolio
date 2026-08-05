import asyncio
import websockets
import json
import traceback

async def test_ws():
    url = "wss://sathyanantham-portfolio-api.onrender.com/ws/chat?session_id=test_session&role=visitor"
    print(f"Connecting to: {url}")
    try:
        async with websockets.connect(url) as websocket:
            print("Successfully connected to live WebSocket!")
            ping_msg = {"type": "chat", "content": "ping"}
            await websocket.send(json.dumps(ping_msg))
            print("Message sent. Waiting for response...")
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            print(f"Received response: {response}")
    except Exception as e:
        print(f"Failed to connect/interact: {repr(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_ws())
