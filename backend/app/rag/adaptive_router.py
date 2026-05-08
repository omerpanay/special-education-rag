"""Adaptive Query Router — Soruyu Otonom Yönlendirici.

─── MİMARİ KARAR: Neden Adaptive Router? ───
Mevcut RAG sistemi sadece yerel pgvector kaynaklarında arar.
Bu yeterli olmayabilir:
  - Soru çok spesifik/güncel → Yerel kaynaklarda yok
  - Öğretmen web araştırması istiyor → "2026 güncel araştırma" vb.
  - Yerel sonuçlar düşük kalitede → cosine_threshold altında

Adaptive Router, Groq LLM kullanarak soruyu ANALİZ eder ve
3 rotadan birine yönlendirir:
  1. LOCAL  → Sadece pgvector (mevcut davranış)
  2. WEB    → Sadece Tavily web araması
  3. HYBRID → Önce yerel, sonra web ile zenginleştir

─── NEDEN GROQ İLE ROUTING? ───
- Hız: Groq ~200ms'de routing kararı verir
- Maliyet: Küçük prompt, düşük token tüketimi
- Esneklik: Kural-tabanlı (if-else) yerine LLM tabanlı → 
  beklenmedik sorularda da doğru yönlendirme
"""

import logging
from enum import Enum
from typing import Optional

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from pydantic import BaseModel, Field

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger("edurag.adaptive_router")


class RouteType(str, Enum):
    """Sorgunun yönlendirileceği rota."""
    LOCAL = "local"
    WEB = "web"
    HYBRID = "hybrid"


class RouteDecision(BaseModel):
    """Router'ın kararını temsil eder.

    route: Hangi kaynaklarda aranacak
    reasoning: Neden bu karar verildi (observability için)
    search_query: Web araması için optimize edilmiş sorgu
    """
    route: RouteType = Field(default=RouteType.LOCAL)
    reasoning: str = Field(default="")
    search_query: Optional[str] = Field(default=None)


# ── Router Prompt ──
# Bu prompt router LLM'e soruyu analiz ettirip yönlendirme kararı aldırır.
# Kısa ve öz — routing hızlı olmalı (max ~200ms)
ROUTER_SYSTEM_PROMPT = """Sen bir sorgu yönlendirme uzmanısın. Görevin öğretmenin sorusunu analiz edip
doğru kaynağa yönlendirmek.

KARAR KRİTERLERİ:
1. "LOCAL" → Soru genel özel eğitim bilgisi, MEB mevzuatı, akademik strateji içeriyorsa
   ve yerel veritabanında ilgili kaynaklar VARSA (aşağıda belirtilecek).
2. "WEB" → Soru şunları içeriyorsa:
   - Güncel tarih/yıl referansı ("2025", "2026", "güncel", "son araştırmalar")
   - Spesifik bir kurum/kişi/etkinlik hakkında bilgi
   - "web'den araştır", "internetten bul" gibi açık talimatlar
   - Yerel kaynaklar YETERSİZ veya BOŞ ise
3. "HYBRID" → Hem yerel bilgi hem güncel web bilgisi gerekiyorsa

CEVAP FORMATI (sadece bu 3 satırı yaz, başka bir şey yazma):
ROUTE: <LOCAL|WEB|HYBRID>
REASON: <kısa açıklama>
SEARCH_QUERY: <web araması için optimize sorgu veya YOK>
"""

ROUTER_HUMAN_PROMPT = """Öğretmenin Sorusu: {question}

Yerel Kaynak Durumu: {local_status}
"""


def _parse_router_response(response_text: str) -> RouteDecision:
    """Router LLM çıktısını yapılandırılmış RouteDecision'a çevir.

    LLM çıktısı her zaman %100 formatına uygun olmayabilir.
    Bu fonksiyon toleranslı bir parser — edge case'leri handle eder.
    """
    lines = response_text.strip().split("\n")
    route = RouteType.LOCAL
    reasoning = ""
    search_query = None

    for line in lines:
        line = line.strip()
        if line.upper().startswith("ROUTE:"):
            route_str = line.split(":", 1)[1].strip().upper()
            if "WEB" in route_str and "HYBRID" not in route_str:
                route = RouteType.WEB
            elif "HYBRID" in route_str:
                route = RouteType.HYBRID
            else:
                route = RouteType.LOCAL
        elif line.upper().startswith("REASON:"):
            reasoning = line.split(":", 1)[1].strip()
        elif line.upper().startswith("SEARCH_QUERY:"):
            sq = line.split(":", 1)[1].strip()
            if sq and sq.upper() != "YOK":
                search_query = sq

    return RouteDecision(
        route=route,
        reasoning=reasoning,
        search_query=search_query,
    )


async def route_query(
    query: str,
    local_result_count: int,
    best_local_score: float = 0.0,
) -> RouteDecision:
    """Öğretmenin sorusunu analiz edip yönlendirme kararı ver.

    Strateji:
    1. Web arama kapalıysa veya Tavily key yoksa → her zaman LOCAL
    2. Keyword-based quick check (hızlı, LLM çağrısı yapmadan)
    3. LLM-based deep analysis (karmaşık sorular için)

    Args:
        query: Öğretmenin sorusu
        local_result_count: Yerel aramada bulunan chunk sayısı
        best_local_score: En iyi yerel sonucun cosine similarity'si

    Returns:
        RouteDecision: Yönlendirme kararı
    """
    # ── Guard: Web arama kapalıysa ──
    if not settings.web_search_enabled or not settings.tavily_api_key:
        return RouteDecision(
            route=RouteType.LOCAL,
            reasoning="Web arama devre dışı (ayar veya API key eksik)",
        )

    # ── Hızlı Keyword Check ──
    # LLM çağrısı yapmadan basit tetikleyicileri yakala
    web_triggers = [
        "güncel", "2025", "2026", "son araştırma", "yeni çalışma",
        "web'den", "internetten", "online", "araştır",
        "son yayın", "son makale", "günümüzde",
    ]
    query_lower = query.lower()
    has_web_trigger = any(trigger in query_lower for trigger in web_triggers)

    # Yerel sonuç yoksa veya çok düşük kalitedeyse → WEB
    if local_result_count == 0:
        return RouteDecision(
            route=RouteType.WEB,
            reasoning="Yerel kaynaklarda sonuç bulunamadı",
            search_query=query,
        )

    # Açık web tetikleyici varsa → HYBRID (yerel + web)
    if has_web_trigger:
        return RouteDecision(
            route=RouteType.HYBRID,
            reasoning=f"Web tetikleyici kelime tespit edildi",
            search_query=query,
        )

    # Yerel sonuçlar yeterli kalitedeyse → LOCAL
    if local_result_count >= 3 and best_local_score >= 0.75:
        return RouteDecision(
            route=RouteType.LOCAL,
            reasoning=f"Yerel kaynaklar yeterli (skor: {best_local_score:.2f}, sonuç: {local_result_count})",
        )

    # ── LLM-based Deep Analysis (belirsiz durumlar için) ──
    try:
        local_status = (
            f"{local_result_count} sonuç bulundu (en iyi skor: {best_local_score:.2f})"
            if local_result_count > 0
            else "Hiç sonuç bulunamadı"
        )

        prompt = ChatPromptTemplate.from_messages([
            ("system", ROUTER_SYSTEM_PROMPT),
            ("human", ROUTER_HUMAN_PROMPT),
        ])

        llm = ChatGroq(
            api_key=settings.groq_api_key,
            model_name=settings.llm_model,
            temperature=0.0,   # Routing kararı deterministik olmalı
            max_tokens=150,    # Kısa yanıt yeterli
        )

        chain = prompt | llm | StrOutputParser()
        response = await chain.ainvoke({
            "question": query,
            "local_status": local_status,
        })

        decision = _parse_router_response(response)
        logger.info(
            f"router_karari route={decision.route.value} "
            f"reasoning={decision.reasoning} query={query[:50]}"
        )
        return decision

    except Exception as e:
        # Router hata verirse güvenli fallback: LOCAL
        logger.error(f"router_hatasi error={e} query={query[:50]}")
        return RouteDecision(
            route=RouteType.LOCAL,
            reasoning=f"Router hatası, güvenli fallback: {str(e)[:50]}",
        )
