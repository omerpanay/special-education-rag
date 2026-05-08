"""Web Arama Modülü — Tavily Search Entegrasyonu.

─── MİMARİ KARAR: Neden Tavily? ───
- LLM-optimized arama motoru (Google/Bing'den farklı)
- Sonuçları clean metin olarak döner (HTML parse gerekmez)
- LangChain native entegrasyonu var
- Ücretsiz tier: 1000 arama/ay

─── NE ZAMAN KULLANILIR? ───
Adaptive Router (adaptive_router.py) karar verir:
1. Yerel kaynaklarda yeterli sonuç yoksa
2. Soru "güncel", "2026", "son araştırmalar" gibi tetikleyiciler içeriyorsa
3. Öğretmen açıkça web araması istiyorsa
"""

import logging
from typing import Optional

from pydantic import BaseModel, Field
from tavily import AsyncTavilyClient

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger("edurag.web_search")


class WebSearchResult(BaseModel):
    """Tek bir web arama sonucunu temsil eder.

    Bu model frontend'e gösterilecek ve LLM bağlamına eklenecek.
    """
    title: str = Field(..., description="Sayfa başlığı")
    url: str = Field(..., description="Kaynak URL'si")
    content: str = Field(..., description="Sayfa içeriğinden çıkarılan metin")
    score: float = Field(0.0, description="Tavily relevance skoru (0-1)")


async def search_web(
    query: str,
    max_results: int = 3,
    search_depth: str = "basic",
    include_domains: Optional[list[str]] = None,
) -> list[WebSearchResult]:
    """Tavily ile web araması yap ve yapılandırılmış sonuçlar döndür.

    Args:
        query: Arama sorgusu (Türkçe veya İngilizce)
        max_results: Maksimum sonuç sayısı (default: 3 — context window koruma)
        search_depth: "basic" veya "advanced" (advanced daha yavaş ama derin)
        include_domains: Sadece bu domainlerde ara (opsiyonel)

    Returns:
        WebSearchResult listesi. Hata durumunda boş liste.

    Note:
        Tavily API key yoksa veya çağrı başarısızsa boş liste döner.
        Sistem ASLA web arama hatası yüzünden çökmez (graceful degradation).
    """
    if not settings.tavily_api_key:
        logger.warning("tavily_api_key_yok - Web arama devre dışı")
        return []

    try:
        client = AsyncTavilyClient(api_key=settings.tavily_api_key)
        response = await client.search(
            query=query,
            max_results=max_results,
            search_depth=search_depth,
            include_domains=include_domains or [],
        )

        results = []
        for item in response.get("results", []):
            results.append(WebSearchResult(
                title=item.get("title", ""),
                url=item.get("url", ""),
                content=item.get("content", ""),
                score=item.get("score", 0.0),
            ))

        logger.info(
            f"web_arama_tamamlandi query={query[:50]} sonuc_sayisi={len(results)}"
        )
        return results

    except Exception as e:
        logger.error(f"web_arama_hatasi error={e} query={query[:50]}")
        return []


def format_web_results_as_context(results: list[WebSearchResult]) -> str:
    """Web sonuçlarını LLM bağlam formatına çevir.

    LLM'in yerel ve web kaynaklarını ayırt edebilmesi için
    farklı bir delimiter kullanıyoruz:
    - Yerel: --- BAĞLAM N (Kaynak: ...) ---
    - Web:   --- WEB KAYNAK N (URL: ...) ---
    """
    if not results:
        return ""

    parts = []
    for idx, result in enumerate(results, 1):
        parts.append(
            f"--- WEB KAYNAK {idx} (Başlık: {result.title}) ---\n"
            f"URL: {result.url}\n"
            f"{result.content}\n"
        )

    return "\n".join(parts)
"""Tavily Search Tool entegrasyonu. Web aramasını yapılandırılmış sonuçlara çevirir."""
