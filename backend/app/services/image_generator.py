"""Image Generator — HuggingFace Inference Router Entegrasyonu.

HuggingFace Ocak 2025'te eski endpoint'i kaldırdı:
  ESKI (404): https://api-inference.huggingface.co/models/{model}
  YENİ (OK):  https://router.huggingface.co/hf-inference/models/{model}

Model Seçimi:
  - black-forest-labs/FLUX.1-schnell: Hızlı, yüksek kalite, ücretsiz tier'da mevcut
  - Fallback: stabilityai/stable-diffusion-3.5-large

Paralel üretim:
  generate_images_batch() ile görseller staggered (sıralı aralıklı) olarak
  asyncio.gather ile paralel üretilir. 4 sahne icin toplam süre ~20sn.
"""

import asyncio
import logging
from typing import Optional

import httpx

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger("edurag.image_generator")

# Yeni HuggingFace Router endpoint (2025)
HF_ROUTER_BASE = "https://router.huggingface.co/hf-inference/models"

# Model öncelik sırası (ücretsiz tier'da katalogda olan modeller)
IMAGE_MODELS = [
    "black-forest-labs/FLUX.1-schnell",
    "stabilityai/stable-diffusion-3.5-large",
]


async def generate_image(
    prompt: str,
    max_retries: int = 3,
) -> Optional[bytes]:
    """Tek bir görsel üret — retry mekanizmalı.

    Args:
        prompt: İngilizce görsel açıklaması
        max_retries: Model başına maksimum deneme sayısı

    Returns:
        JPEG/PNG bytes veya None (hata durumunda)
    """
    if not settings.huggingface_api_token:
        logger.warning("hf_token_yok gorsel_uretim_devre_disi")
        return None

    safe_prompt = (
        f"{prompt}, cute cartoon style, colorful, child-friendly, "
        "bright colors, safe for kids, no text, high quality illustration"
    )

    headers = {
        "Authorization": f"Bearer {settings.huggingface_api_token}",
        "Content-Type": "application/json",
    }

    for model in IMAGE_MODELS:
        url = f"{HF_ROUTER_BASE}/{model}"
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    resp = await client.post(
                        url,
                        headers=headers,
                        json={"inputs": safe_prompt},
                    )

                if resp.status_code == 200:
                    ct = resp.headers.get("content-type", "")
                    if "image" in ct:
                        logger.info(
                            f"gorsel_uretildi model={model} "
                            f"boyut={len(resp.content)} "
                            f"prompt={prompt[:50]}"
                        )
                        return resp.content
                    else:
                        logger.warning(f"beklenmedik_icerik model={model} ct={ct}")

                elif resp.status_code == 503:
                    # Model yükleniyor — kısa bekle
                    wait = 5 * (attempt + 1)
                    logger.info(f"model_yukleniyor model={model} bekleme={wait}sn")
                    await asyncio.sleep(wait)

                elif resp.status_code == 429:
                    wait = 10 * (attempt + 1)
                    logger.warning(f"rate_limit model={model} bekleme={wait}sn")
                    await asyncio.sleep(wait)

                else:
                    logger.error(
                        f"hf_hata model={model} status={resp.status_code} "
                        f"body={resp.text[:150]}"
                    )
                    break  # Bu model çalışmıyor, sıradakini dene

            except httpx.TimeoutException:
                logger.warning(f"timeout model={model} deneme={attempt + 1}")
                await asyncio.sleep(5)
            except Exception as e:
                logger.error(f"beklenmedik_hata model={model} error={e!r}")
                break

    logger.error(f"tum_modeller_basarisiz prompt={prompt[:50]}")
    return None


async def generate_images_batch(
    prompts: list[str],
    stagger_delay: float = 3.0,
) -> list[Optional[bytes]]:
    """N görseli paralel + staggered (sıralı aralıklı) üret.

    Her görsel için başlatmayı `stagger_delay` saniye geciktirip
    hepsini gather ile paralel bekleriz.

    4 sahne için toplam süre:
      Sıralı: 4 × ~15sn = 60sn
      Staggered: 3×3sn offset + ~15sn = ~24sn

    Args:
        prompts: Üretilecek görsel prompt listesi
        stagger_delay: Her iş arasındaki başlangıç gecikmesi (saniye)

    Returns:
        Her prompt için bytes veya None listesi
    """
    async def _delayed(prompt: str, idx: int) -> Optional[bytes]:
        if idx > 0:
            await asyncio.sleep(idx * stagger_delay)
        return await generate_image(prompt)

    tasks = [_delayed(p, i) for i, p in enumerate(prompts)]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    return [
        r if isinstance(r, (bytes, type(None))) else None
        for r in results
    ]
