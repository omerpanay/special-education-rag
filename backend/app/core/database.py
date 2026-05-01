"""Async Veritabanı Engine ve Session Yönetimi.

Constitution İlkesi III: Async-First — asyncpg driver ile
non-blocking I/O. Bir sorgu beklerken başka isteklere hizmet verilir.

Mimari Kararlar:
- create_async_engine: Bağlantı havuzu (connection pool) yönetir.
  pool_size=10 → aynı anda 10 bağlantı açık tutulur.
  max_overflow=20 → yoğun anlarda 20 ek bağlantı açılabilir.
- async_sessionmaker: Her request için yeni session oluşturur.
  expire_on_commit=False → commit sonrası nesneler hâlâ okunabilir.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings

settings = get_settings()

# ── Engine: Veritabanı bağlantı havuzu ──
# pool_size=10: Normal durumda 10 bağlantı açık tutar
# max_overflow=20: Yoğun anlarda 20 ek bağlantı açabilir (toplam 30)
# echo=False: SQL sorgularını loglamaz (production güvenliği)
engine = create_async_engine(
    settings.database_url,
    pool_size=10,
    max_overflow=20,
    echo=False,
)

# ── Session Factory: Her istek için bağımsız session ──
# autocommit=False: Değişiklikleri açıkça commit etmelisin
# autoflush=False: Session'a eklenen nesneler otomatik flush olmaz
# expire_on_commit=False: Commit sonrası nesne attribute'ları hâlâ erişilebilir
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI Dependency — her request için yeni session.

    Kullanım:
        @router.get("/")
        async def my_endpoint(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(Teacher))

    yield ile session'ı sağlıyoruz.
    Request bittikten sonra (finally bloğu) session kapatılır.
    Hata olursa otomatik rollback yapılır.
    """
    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
