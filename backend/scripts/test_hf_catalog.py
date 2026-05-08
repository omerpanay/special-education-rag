"""HuggingFace desteklenen text-to-image modellerini listele."""
import httpx, os
from dotenv import load_dotenv

load_dotenv()
token = os.getenv("HUGGINGFACE_API_TOKEN")

# HF Router katalogunu sorgula
r = httpx.get(
    "https://router.huggingface.co/hf-inference/models",
    headers={"Authorization": f"Bearer {token}"},
    params={"task": "text-to-image", "limit": 20},
)
print(f"Status: {r.status_code}")
print(r.text[:3000])
