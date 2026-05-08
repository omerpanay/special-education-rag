"""HuggingFace yeni router ile FLUX.1-schnell testi."""
import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()
token = os.getenv("HUGGINGFACE_API_TOKEN")
print(f"Token: {token[:10]}..." if token else "TOKEN YOK!")

# HuggingFace'in yeni Inference Providers router endpoint'i
# Ocak 2025'te eski api-inference.huggingface.co → router.huggingface.co/hf-inference'a taşındı
MODELS = [
    ("hf-inference", "black-forest-labs/FLUX.1-schnell"),
    ("hf-inference", "stabilityai/stable-diffusion-xl-base-1.0"),
    ("fal-ai", "black-forest-labs/FLUX.1-schnell"),  # fal.ai provider üzerinden
]

async def test():
    async with httpx.AsyncClient(timeout=60.0) as client:
        for provider, model in MODELS:
            url = f"https://router.huggingface.co/{provider}/models/{model}"
            print(f"\nTest: {provider}/{model}")
            resp = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json={"inputs": "a cute cartoon astronaut boy"},
            )
            ct = resp.headers.get("content-type", "")
            print(f"  Status: {resp.status_code} | CT: {ct} | Size: {len(resp.content)}")
            if resp.status_code != 200:
                print(f"  Error: {resp.text[:200]}")
            else:
                print(f"  ✅ BAŞARILI! Resim boyutu: {len(resp.content)} bytes")
                with open(f"test_{provider.replace('-','_')}_{model.split('/')[-1]}.jpg", "wb") as f:
                    f.write(resp.content)
                print(f"  Kaydedildi.")

asyncio.run(test())
