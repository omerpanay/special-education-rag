"""RAG Veri Yükleme Boru Hattı (Ingestion Pipeline).

─── MİMARİ KARAR: Neden bu pipeline var? ───
RAG = Retrieval Augmented Generation. LLM'e "her şeyi bil" demek yerine,
önce ilgili dokümanları bulup LLM'e "sadece bunları oku ve cevapla" deriz.
Ama LLM'e 200 sayfalık PDF'i toptan veremeyiz (context window sınırı).
Bu yüzden pipeline şu adımları uygular:

1. PARSE:  PDF → Sayfa sayfa düz metin
2. CHUNK:  Metin → Küçük parçalar (1000 karakter, 200 overlap)
3. EMBED:  Parça → 1024 boyutlu sayısal vektör
4. STORE:  Vektör + metin → PostgreSQL (pgvector)

─── ALTERNATİF KARARLARI ───
PDF Parser:
  - PyPDFLoader (seçtik): Basit, güvenilir, sayfa metadata'sı verir
  - pdfplumber: Tablo çıkarmada daha iyi ama daha yavaş
  - unstructured: En güçlü ama çok ağır dependency

Chunking:
  - RecursiveCharacterTextSplitter (seçtik): Paragraf→Cümle→Kelime sırasıyla böler
  - TokenTextSplitter: Token bazlı böler, LLM context için daha hassas
  - SemanticChunker: Anlam değişikliğinde böler, en akıllı ama yavaş

Embedding:
  - multilingual-e5-large (seçtik): Türkçe desteği güçlü, 1024 boyut
  - text-embedding-ada-002 (OpenAI): API çağrısı gerekir, maliyet var
  - all-MiniLM-L6-v2: Hızlı ama Türkçe zayıf, 384 boyut
"""

import hashlib
from typing import Optional
from uuid import UUID

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.academic_source import AcademicSource, SourceType
from app.models.source_chunk import SourceChunk

settings = get_settings()

# ── Singleton Embedding Model ──
# Model ilk çağrıda HuggingFace'den indirilir (~2.2GB).
# Global tutuyoruz çünkü her istek için model yüklemek ~30 saniye sürer.
# Bu pattern'e "Lazy Singleton" denir.
_embedding_model: Optional[SentenceTransformer] = None


def get_embedding_model() -> SentenceTransformer:
    """Embedding modelini Singleton olarak getir.

    Neden Singleton?
    - Model yükleme: ~30 saniye, ~2GB RAM
    - Her istekte yüklemek: Kabul edilemez
    - Bir kez yükle, sonsuza kadar kullan
    """
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer(settings.embedding_model)
    return _embedding_model


def calculate_file_hash(file_path: str) -> str:
    """SHA-256 hash ile dosya parmak izi oluştur.

    Neden SHA-256?
    - Aynı dosya her zaman aynı hash'i üretir
    - Farklı dosyalar farklı hash üretir (çakışma olasılığı ~0)
    - 64 karakter hex string döner
    - DB'de unique constraint ile duplikasyon engellenir
    """
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        # 4KB'lık bloklar halinde oku — büyük dosyalarda RAM taşmasını önler
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


async def ingest_pdf(
    file_path: str,
    title: str,
    source_type: SourceType,
    teacher_id: UUID,
    db: AsyncSession,
) -> AcademicSource:
    """PDF'i oku, parçala, vektörleştir ve veritabanına kaydet.

    Bu fonksiyon tüm pipeline'ı orkestre eder.
    Production'da bu işlem uzun sürebilir (büyük PDF + embedding).
    İleride Celery gibi bir task queue'ya taşınabilir.
    """
    file_hash = calculate_file_hash(file_path)

    # ── Duplikasyon Kontrolü (Idempotency) ──
    # Aynı PDF daha önce yüklenmişse tekrar işleme. Mevcut kaydı döndür.
    # Production'da bu önemli: Kullanıcı yanlışlıkla aynı dosyayı iki kez
    # sürüklerse veya retry mekanizması tetiklenirse sistem çökmemeli.
    existing = await db.execute(
        select(AcademicSource).where(AcademicSource.file_hash == file_hash)
    )
    existing_source = existing.scalar_one_or_none()
    if existing_source is not None:
        return existing_source

    # ── ADIM 1: Kaynak kaydı oluştur ──
    source = AcademicSource(
        title=title,
        source_type=source_type,
        file_name=file_path.split("/")[-1] if "/" in file_path else file_path.split("\\")[-1],
        file_hash=file_hash,
        uploaded_by=str(teacher_id),
        is_indexed=False,
    )
    db.add(source)
    await db.flush()  # source.id üretilir ama henüz commit yok

    # ── ADIM 2: PDF → Sayfa sayfa metin ──
    # PyPDFLoader her sayfayı ayrı Document nesnesi olarak döner
    # Her Document'ta: page_content (metin) + metadata (sayfa no, dosya adı)
    loader = PyPDFLoader(file_path)
    docs = loader.load()
    source.page_count = len(docs)

    # ── ADIM 3: Metin → Parçalar (Chunking) ──
    # chunk_size=1000: Her parça max 1000 karakter
    # chunk_overlap=200: Parçalar arası 200 karakter örtüşme
    #
    # Neden overlap?
    # "Otizmli çocuklarda sosyal beceri eğitimi | çok önemlidir çünkü..."
    #                                          ^--- Buradan bölünürse
    # İlk parça: "...sosyal beceri eğitimi"
    # İkinci parça: "eğitimi çok önemlidir çünkü..."
    # Overlap sayesinde "eğitimi" iki parçada da var → bağlam kopmaz
    #
    # separators sırası: Önce paragraf (\n\n), sonra satır (\n),
    # sonra cümle (.), sonra kelime ( ), en son karakter bazlı
    # PostgreSQL '\x00' (null byte) karakterini desteklemez, temizleyelim
    for doc in docs:
        if doc.page_content:
            doc.page_content = doc.page_content.replace("\x00", "")

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ".", " ", ""],
    )
    chunks = text_splitter.split_documents(docs)

    # Boş chunk'ları filtrele (Embedding modelinin hata vermesini önler)
    chunks = [chunk for chunk in chunks if chunk.page_content and chunk.page_content.strip()]

    # ── ADIM 4: Parçalar → Vektörler (Embedding) ──
    # SentenceTransformer.encode() batch olarak çalışır
    # 50 chunk'ı tek tek encode etmek yerine hepsini birden veririz → GPU/CPU optimizasyonu
    # normalize_embeddings=True: Vektörleri birim uzunluğa normalize eder
    # Bu sayede cosine similarity = dot product olur → daha hızlı hesaplama
    model = get_embedding_model()
    chunk_texts = [chunk.page_content for chunk in chunks]
    embeddings = model.encode(chunk_texts, normalize_embeddings=True)

    # ── ADIM 5: Veritabanına kaydet ──
    source_chunks = []
    for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        page_num = chunk.metadata.get("page", 0) + 1  # 0-indexed → 1-indexed

        db_chunk = SourceChunk(
            source_id=source.id,
            content=chunk.page_content,
            embedding=embedding.tolist(),  # numpy array → Python list
            # func.to_tsvector: PostgreSQL tarafında Türkçe kelime köklerine ayırır
            # "öğrencilerin eğitimi" → 'eğitim' 'öğrenci'
            fts_vector=func.to_tsvector("turkish", chunk.page_content),
            page_numbers=[page_num],
            chunk_index=idx,
            chunk_size=len(chunk.page_content),
            chunk_overlap=200 if idx > 0 else 0,
            embedding_model=settings.embedding_model,
        )
        source_chunks.append(db_chunk)

    db.add_all(source_chunks)
    source.is_indexed = True

    await db.commit()
    await db.refresh(source)

    return source
