"""HuggingFace Yeni Router Endpoint Testi."""
import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()
token = os.getenv("HUGGINGFACE_API_TOKEN")

print(f"Token mevcut: {'Evet' if token else 'HAYIR'}")

# Yeni HF Router endpoint (Ocak 2025'ten itibaren)
NEW_ENDPOINT = "https://router.huggingface.co/hf-inference/models"

# Test edilecek image modeller (yeni katalogda olan stabil modeller)
MODELS = [
    "stabilityai/stable-diffusion-2-1",
    "runwayml/stable-diffusion-v1-5",
    "CompVis/stable-diffusion-v1-4",
]

async def test():
    async with httpx.AsyncClient(timeout=30.0) as client:
        for model in MODELS:
            url = f"{NEW_ENDPOINT}/{model}"
            resp = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json={"inputs": "a cute cartoon astronaut"},
            )
            content_type = resp.headers.get("content-type", "")
            size = len(resp.content)
            print(f"[{resp.status_code}] {model}")
            print(f"  Content-Type: {content_type}")
            print(f"  Size: {size} bytes")
            if resp.status_code != 200:
                print(f"  Error: {resp.text[:150]}")
            print()

asyncio.run(test())
