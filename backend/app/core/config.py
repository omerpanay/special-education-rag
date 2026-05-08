"""Uygulama Konfigürasyonu — Pydantic Settings.

Tüm ortam değişkenleri burada tanımlanır ve tip güvenliği sağlanır.
.env dosyasından otomatik okunur. Yanlış tip veya eksik zorunlu alan
olduğunda uygulama başlamadan hata verir (fail fast).

Constitution İlkesi IV: Strict Type Safety — Pydantic strict mode.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Merkezi konfigürasyon.

    Her alan bir ortam değişkenine karşılık gelir.
    Örnek: DATABASE_URL → settings.database_url
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,  # DATABASE_URL = database_url
        extra="ignore",        # Pydantic v2 .env'deki fazla değişkenlere kızmasın diye
    )

    # ── Veritabanı ──
    database_url: str = "postgresql+asyncpg://postgres:sifrem123@localhost:5433/edurag"

    # ── LLM (Groq) ──
    groq_api_key: str
    llm_model: str = "llama-3.3-70b-versatile"

    # ── Embedding ──
    embedding_model: str = "intfloat/multilingual-e5-large"

    # ── RAG Ayarları ──
    # Constitution İlkesi I: Zero-Hallucination
    # Bu eşiğin altındaki sonuçlar kullanıcıya gösterilmez
    cosine_threshold: float = 0.70

    # ── Güvenlik ──
    secret_key: str  # .env'de tanımlanması zorunlu — varsayılan yok
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # ── Uygulama ──
    app_name: str = "EduRAG"
    debug: bool = False

    # ── Agentic RAG (Faz 1) ──
    tavily_api_key: str = ""            # Yoksa web arama devre dışı kalır
    web_search_enabled: bool = True     # Feature flag

    # ── HuggingFace (Faz 3) ──
    huggingface_api_token: str = ""

    # ── Whisper STT (Faz 2) ──
    whisper_model: str = "whisper-large-v3-turbo"


@lru_cache
def get_settings() -> Settings:
    """Singleton Settings instance.

    @lru_cache ile sadece 1 kez oluşturulur.
    Her çağrıda aynı nesne döner — performans için önemli.
    """
    return Settings()
