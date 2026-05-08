"""
EduRAG Backend — Otomatik Entegrasyon Testi
Tum kritik endpoint'leri sirayla test eder.
"""
import asyncio
import sys
import httpx

BASE = "http://localhost:8000"
RESULTS = []

# Test sabitleri (Osman'in hesabi)
TEST_EMAIL = "osman@gmail.com"
TEST_PASSWORD = "12345678"
TEST_STUDENT_ID = "9b9e8b99-4cd4-4561-ac18-a1db3143f03b"


def ok(name: str, detail: str = ""):
    msg = f"PASS  {name}"
    if detail:
        msg += f"  ({detail})"
    print(msg)
    RESULTS.append(("PASS", name))


def fail(name: str, detail: str = ""):
    msg = f"FAIL  {name}"
    if detail:
        msg += f"  -- {detail}"
    print(msg)
    RESULTS.append(("FAIL", name))


def info(msg: str):
    print(f"INFO  {msg}")


async def run_tests():
    async with httpx.AsyncClient(
        base_url=BASE,
        timeout=120.0,
        follow_redirects=True,
    ) as client:

        print("\n=== EduRAG Backend Entegrasyon Testi ===\n")

        # ----------------------------------
        # 1. Health Check
        # ----------------------------------
        print("[1] Saglik Kontrolu")
        r = await client.get("/health")
        if r.status_code == 200 and r.json().get("status") == "healthy":
            ok("GET /health", f"app={r.json().get('app')}")
        else:
            fail("GET /health", r.text[:100])

        # ----------------------------------
        # 2. Auth - Login
        # ----------------------------------
        print("\n[2] Kimlik Dogrulama")
        r = await client.post("/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        if r.status_code == 200:
            token = r.json().get("access_token")
            teacher_id = r.json().get("teacher_id", "?")
            ok("POST /auth/login", f"token={token[:20]}...")
        else:
            fail("POST /auth/login", f"status={r.status_code} {r.text[:100]}")
            print("\nKimlik dogrulama basarisiz -- test durduruluyor.")
            return

        auth = {"Authorization": f"Bearer {token}"}

        # ----------------------------------
        # 3. Ogrenci API
        # ----------------------------------
        print("\n[3] Ogrenci API")
        r = await client.get("/api/v1/students/", headers=auth)
        if r.status_code == 200:
            data = r.json()
            total = data.get("total", len(data.get("items", [])))
            ok("GET /students/", f"toplam={total} ogrenci")
        else:
            fail("GET /students/", f"status={r.status_code} {r.text[:100]}")

        info(f"Test ogrenci ID: {TEST_STUDENT_ID}")

        # ----------------------------------
        # 4. RAG Sorgu - Alan ici
        # ----------------------------------
        print("\n[4] RAG Sorgu")
        r = await client.post("/api/v1/query", headers=auth, json={
            "query": "BEP nasil hazirlanir, hangi adimlar izlenir?",
            "student_id": TEST_STUDENT_ID,
        })
        if r.status_code == 200:
            data = r.json()
            answer_len = len(data.get("answer", ""))
            is_fallback = data.get("is_fallback", True)
            route = data.get("route_decision", "?")
            latency = data.get("total_latency_ms", 0)
            if not is_fallback and answer_len > 50:
                ok("POST /query (alan ici)", f"route={route} latency={latency:.0f}ms cevap={answer_len}krktr")
            else:
                fail("POST /query (alan ici)", f"is_fallback={is_fallback} answer_len={answer_len}")
        else:
            fail("POST /query (alan ici)", f"status={r.status_code}")

        # RAG - Alan disi (guardrail)
        r = await client.post("/api/v1/query", headers=auth, json={
            "query": "Futbol dunya kupasinda kac takim yarisiyor?",
        })
        if r.status_code == 200:
            data = r.json()
            if data.get("is_fallback"):
                ok("POST /query (alan disi guardrail)", "reddedildi")
            else:
                fail("POST /query (alan disi guardrail)", "GUARDRAIL CALISMADI -- halusinasyon riski")
        else:
            fail("POST /query (alan disi)", f"status={r.status_code}")

        # ----------------------------------
        # 5. Gozlem - Text-to-Action
        # ----------------------------------
        print("\n[5] Gozlem -- Text-to-Action (ABC Analizi)")
        r = await client.post("/api/v1/observations/", headers=auth, json={
            "student_id": TEST_STUDENT_ID,
            "category": "Davranis",
            "summary": (
                "Ogrenci ders sirasinda aniden masaya vurdu ve aglamaya basladi. "
                "Yanina gidip sakinlestirici topu verince 2 dakika icinde sakinlesti."
            ),
            "antecedent": "",
            "behavior": "",
            "consequence": "",
        })
        if r.status_code == 201:
            data = r.json()
            ant = data.get("antecedent") or ""
            beh = data.get("behavior") or ""
            con = data.get("consequence") or ""
            latency = data.get("structuring_latency_ms") or 0
            if ant and beh and con:
                ok("POST /observations/ (Text-to-Action)", f"ABC dolduruldu latency={latency:.0f}ms")
            else:
                fail("POST /observations/ (Text-to-Action)", f"ABC bos kaldi A={bool(ant)} B={bool(beh)} C={bool(con)}")
        else:
            fail("POST /observations/", f"status={r.status_code} {r.text[:150]}")

        # ----------------------------------
        # 6. Materyal Uretimi (HuggingFace)
        # ----------------------------------
        print("\n[6] Materyal Uretimi (HuggingFace FLUX.1-schnell)")
        info("Bu test ~20-30sn surebilir...")
        r = await client.post("/api/v1/materials/generate", headers=auth, json={
            "student_id": TEST_STUDENT_ID,
            "material_type": "social_story",
            "interest_topic": "Hayvanlar ve Doga",
            "scene_count": 2,
        })

        # materials/generate 200 veya 201 donebilir
        if r.status_code in (200, 201):
            data = r.json()
            status = data.get("status", "?")
            scenes = data.get("content", {}).get("scenes", [])
            images_ok = sum(1 for s in scenes if s.get("image_path"))
            pdf_ok = bool(data.get("pdf_path"))
            gen_ms = data.get("content", {}).get("metadata", {}).get("generation_time_ms", 0)

            if status == "completed":
                ok("POST /materials/generate (durum)", f"status=completed sure={gen_ms:.0f}ms")
            else:
                fail("POST /materials/generate (durum)", f"status={status}")

            if images_ok > 0:
                ok("Gorsel uretimi", f"basarili={images_ok}/{len(scenes)}")
            else:
                fail("Gorsel uretimi", f"Hic gorsel uretilmedi (HF token sorunu olabilir)")

            if pdf_ok:
                ok("PDF olusturuldu", data.get("pdf_path", "")[-50:])
            else:
                fail("PDF olusturulamadi")
        else:
            fail("POST /materials/generate", f"status={r.status_code} {r.text[:150]}")

        # ----------------------------------
        # 7. Sonuc Ozeti
        # ----------------------------------
        passed = sum(1 for s, _ in RESULTS if s == "PASS")
        failed_count = sum(1 for s, _ in RESULTS if s == "FAIL")
        total = len(RESULTS)

        print(f"\n=== Sonuc ===")
        print(f"  Toplam  : {total}")
        print(f"  Gecti   : {passed}")
        print(f"  Kaldi   : {failed_count}")

        if failed_count == 0:
            print("\nBackend hazir! Frontend'e gecebiliriz.\n")
            sys.exit(0)
        else:
            print(f"\nBackend'de {failed_count} sorun var.\n")
            sys.exit(1)


asyncio.run(run_tests())
