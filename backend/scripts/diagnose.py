"""
EduRAG Backend — Diagnostik: Hangi URL'ler doğru?
"""
import httpx

BASE = "http://localhost:8000"

# 1. Token al
r = httpx.post(f"{BASE}/api/v1/auth/login", json={"email": "osman@gmail.com", "password": "12345678"})
token = r.json()["access_token"]
auth = {"Authorization": f"Bearer {token}"}
print(f"Auth OK - teacher_id check")

# 2. Osman'ın teacher_id'sini bul
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def q():
    engine = create_async_engine("postgresql+asyncpg://postgres:sifrem123@localhost:5433/edurag")
    async with engine.connect() as c:
        r2 = await c.execute(text("SELECT id FROM teachers WHERE email='osman@gmail.com'"))
        teacher_id = r2.scalar()
        print(f"Teacher ID: {teacher_id}")
        r3 = await c.execute(text(f"SELECT id, name FROM students WHERE teacher_id='{teacher_id}' LIMIT 3"))
        students = r3.fetchall()
        print(f"Students: {students}")
        return teacher_id, students

teacher_id, students = asyncio.run(q())

# 3. Doğru student_id ile test
student_id = students[0][0] if students else None
print(f"\nKullanilacak student_id: {student_id}")

# 4. Students endpoint
r = httpx.get(f"{BASE}/api/v1/students/", headers=auth)
print(f"\nGET /students/ -> {r.status_code}: {r.text[:200]}")

# 5. Query (trailing slash olmadan)
r = httpx.post(f"{BASE}/api/v1/query", headers=auth, json={
    "query": "Otizmli cocuklarda sosyal beceri gelistirme yontemleri nelerdir?",
    "student_id": str(student_id)
}, follow_redirects=True)
print(f"\nPOST /query -> {r.status_code}: {r.text[:200]}")

# 6. Observation (student_id ile)
r = httpx.post(f"{BASE}/api/v1/observations/", headers=auth, json={
    "student_id": str(student_id),
    "category": "Davranis",
    "summary": "Ogrenci ders sirasinda aniden masaya vurdu ve aglamaya basladi.",
    "antecedent": "",
    "behavior": "",
    "consequence": ""
}, follow_redirects=True)
print(f"\nPOST /observations/ -> {r.status_code}: {r.text[:300]}")
