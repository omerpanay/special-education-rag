import httpx
import asyncio

async def test_pollinations():
    prompt = "A cute astronaut boy, cartoon style, highly detailed"
    encoded_prompt = prompt.replace(" ", "%20")
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=512&height=512&nologo=true"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, timeout=30.0)
        print(f"Status: {response.status_code}")
        print(f"Content Type: {response.headers.get('content-type')}")
        print(f"Size: {len(response.content)} bytes")

asyncio.run(test_pollinations())
