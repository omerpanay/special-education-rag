import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()
token = os.getenv("HUGGINGFACE_API_TOKEN")

models = [
    "black-forest-labs/FLUX.1-schnell",
    "stabilityai/stable-diffusion-xl-base-1.0",
    "runwayml/stable-diffusion-v1-5",
    "prompthero/openjourney"
]

async def test():
    async with httpx.AsyncClient() as client:
        for m in models:
            url = f"https://api-inference.huggingface.co/models/{m}"
            resp = await client.post(
                url,
                headers={"Authorization": f"Bearer {token}"},
                json={"inputs": "A cute astronaut"}
            )
            print(f"Model: {m} -> Status: {resp.status_code}")
            if resp.status_code != 200:
                print(f"Error: {resp.text[:100]}")

asyncio.run(test())
