import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def q():
    engine = create_async_engine("postgresql+asyncpg://postgres:sifrem123@localhost:5433/edurag")
    async with engine.connect() as c:
        r = await c.execute(text("SELECT id, email FROM teachers LIMIT 3"))
        print("Teachers:", r.fetchall())

asyncio.run(q())
