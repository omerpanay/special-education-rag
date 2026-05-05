"""Hibrit RAG Arama Motoru (Hybrid Retrieval Engine).

─── MİMARİ KARAR: Neden Hibrit Arama? ───
Tek başına vektör araması veya tek başına kelime araması yetersizdir:

Vektör (Semantic):
  ✅ "Otizmde iletişim" → "ASD'de sosyal etkileşim" bulur (anlam benzerliği)
  ❌ "MEB 2024 genelge 5. madde" → bulamaz (özel isimler/numaralar)

FTS (Keyword):
  ✅ "MEB 2024 genelge" → tam eşleşme bulur
  ❌ "iletişim" → "sosyal etkileşim" bulamaz (farklı kelimeler)

Hibrit = İkisini birleştir → her iki gücü kullan.

─── SKOR BİRLEŞTİRME STRATEJİLERİ ───
  - RRF (Reciprocal Rank Fusion): Sıralama bazlı, skor ölçeğinden bağımsız
  - Weighted Sum (seçtik): 0.7*semantic + 0.3*keyword → basit, etkili
  - Learn-to-Rank: ML ile öğrenilen ağırlıklar → en iyi ama karmaşık

0.7/0.3 neden?
  - Akademik metinlerde anlam araması daha önemli (0.7)
  - Ama MEB genelge numarası gibi kesin terimler de lazım (0.3)
  - Bu oranlar A/B test ile production'da optimize edilir

─── DIVERSITY (ÇEŞİTLİLİK) PROBLEMİ ───
İlk 5 sonuç hep aynı PDF'in ardışık sayfalarından gelirse,
cevabımız tek kaynağa bağımlı olur. MMR (Maximal Marginal Relevance)
ile farklı kaynaklardan sonuçları öne çıkarırız.
"""

from typing import List, Tuple

from sqlalchemy import desc, func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.source_chunk import SourceChunk
from app.rag.ingestion import get_embedding_model

settings = get_settings()


async def retrieve_hybrid_chunks(
    db: AsyncSession,
    query_text: str,
    limit: int = 5,
    threshold: float = settings.cosine_threshold,
) -> List[Tuple[SourceChunk, float]]:
    """Soruyu veritabanında arar ve (chunk, skor) listesi döner.

    Parametre açıklamaları:
    - limit=5: En fazla 5 sonuç döndür (LLM context window'u düşünerek)
    - threshold=0.70: Bu skorun altındaki sonuçlar atılır (Zero-Hallucination)
    """
    model = get_embedding_model()

    # ── ADIM 1: Soruyu vektöre çevir ──
    # E5 modeli sorgular için "query: " öneki bekler.
    # Bu prefix modelin sorgu ve doküman vektörlerini ayırt etmesini sağlar.
    # Dokümanları encode ederken "passage: " prefix'i kullanılır (ingestion'da).
    query_embedding = model.encode(
        f"query: {query_text}",
        normalize_embeddings=True
    ).tolist()

    # ── ADIM 2: Cosine Similarity hesapla ──
    # pgvector'ün cosine_distance() fonksiyonu 0-2 arası döner (0=identik, 2=zıt)
    # Biz similarity istiyoruz: similarity = 1 - distance (0-1 arası, 1=identik)
    cosine_sim = (
        1 - SourceChunk.embedding.cosine_distance(query_embedding)
    ).label("cosine_sim")

    # ── ADIM 3: FTS (Full Text Search) skoru hesapla ──
    # websearch_to_tsquery: Kullanıcı dostu sorgu çözümleyici
    #   "otizm sosyal beceri" → 'otizm' & 'sosyal' & 'beceri'
    # ts_rank_cd: Cover Density sıralaması (kelimelerin yakınlığına bakar)
    ts_query = func.websearch_to_tsquery("turkish", query_text)
    fts_rank = func.ts_rank_cd(SourceChunk.fts_vector, ts_query).label("fts_rank")

    # ── ADIM 4: Ağırlıklı skor + Negatif feedback penaltısı ──
    # RLHF döngüsü: Öğretmen "Beğenmedim" → chunk'ın negative_feedback_count +1
    # Her +1 feedback, chunk'ın skorunu 0.02 düşürür
    # 5 kez beğenilmeyen chunk: 0.10 penaltı → etkili şekilde sıralamadan düşer
    penalty = SourceChunk.negative_feedback_count * 0.02

    combined_score = (
        (cosine_sim * 0.7) +
        (func.coalesce(fts_rank, 0.0) * 0.3) -
        penalty
    ).label("score")

    # ── ADIM 5: Sorguyu çalıştır ──
    # limit * 2 çekiyoruz çünkü MMR filtresi bazılarını eleyecek
    stmt = (
        select(SourceChunk, combined_score)
        .options(selectinload(SourceChunk.source))
        .where(cosine_sim >= threshold)
        .order_by(desc("score"))
        .limit(limit * 2)
    )

    result = await db.execute(stmt)
    chunks_with_scores = result.all()

    # ── ADIM 6: Basitleştirilmiş MMR (Çeşitlilik Filtresi) ──
    # Gerçek MMR formülü: score = λ * sim(q,d) - (1-λ) * max(sim(d,d_i))
    # Biz basitleştirilmiş versiyon kullanıyoruz:
    # Aynı kaynaktan 2. chunk gelirse skorunu 0.05 düşür
    selected: List[Tuple[SourceChunk, float]] = []
    seen_sources: set = set()

    for chunk, score in chunks_with_scores:
        if len(selected) >= limit:
            break

        source_key = chunk.source_id
        if source_key in seen_sources:
            score -= 0.05  # Aynı PDF'ten tekrar → penaltı
        else:
            seen_sources.add(source_key)

        selected.append((chunk, float(score)))

    selected.sort(key=lambda x: x[1], reverse=True)
    return selected[:limit]
