"""Veritabani kurulum scripti - tek seferlik calistirilir."""

import asyncio
import asyncpg


async def setup() -> None:
    print("Baglaniliyor: postgres:5433/postgres ...")
    conn = await asyncpg.connect(
        host="localhost", port=5433, user="postgres",
        password="sifrem123", database="postgres",
    )
    try:
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = 'edurag'"
        )
        if exists:
            print("[OK] 'edurag' veritabani zaten mevcut.")
        else:
            await conn.execute("CREATE DATABASE edurag")
            print("[OK] 'edurag' veritabani olusturuldu.")
    finally:
        await conn.close()

    print("'edurag' veritabanina baglaniliyor ...")
    conn2 = await asyncpg.connect(
        host="localhost", port=5433, user="postgres",
        password="sifrem123", database="edurag",
    )
    try:
        await conn2.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        version = await conn2.fetchval(
            "SELECT extversion FROM pg_extension WHERE extname = 'vector'"
        )
        print(f"[OK] pgvector aktif - version: {version}")
    finally:
        await conn2.close()

    print("[DONE] Veritabani kurulumu tamamlandi!")


if __name__ == "__main__":
    asyncio.run(setup())
