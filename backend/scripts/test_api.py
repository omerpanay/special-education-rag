import os
import time
import requests

BASE_URL = "http://127.0.0.1:8000/api/v1"
PDF_PATH = r"C:\new\Capstone-PROJECT\Sources\Otizm-Spektrum-Bozuklugu-El-Kitabi.pdf"

def run_test():
    print("🚀 EduRAG Uçtan Uca Test Başlıyor...\n")

    # 1. Kayıt ve Giriş
    print("1️⃣ Öğretmen kaydı ve girişi yapılıyor...")
    email = f"test_{int(time.time())}@edurag.com"
    password = "SuperSecretPassword123"
    
    reg_resp = requests.post(f"{BASE_URL}/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Test Öğretmeni",
        "branch": "Özel Eğitim"
    })
    
    if reg_resp.status_code != 201:
        print("❌ Kayıt başarısız:", reg_resp.text)
        return
        
    login_resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Giriş başarılı! JWT Token alındı.\n")

    # 2. PDF Yükleme (Ingestion Pipeline)
    print("2️⃣ PDF Yükleniyor (Bu işlem vektörleştirme nedeniyle biraz sürebilir)...")
    print(f"   Dosya: {os.path.basename(PDF_PATH)}")
    
    t0 = time.time()
    with open(PDF_PATH, "rb") as f:
        files = {"file": (os.path.basename(PDF_PATH), f, "application/pdf")}
        data = {
            "title": "Otizm Spektrum Bozukluğu El Kitabı",
            "source_type": "MEB"
        }
        upload_resp = requests.post(f"{BASE_URL}/sources/upload", headers=headers, files=files, data=data)
    
    t1 = time.time()
    if upload_resp.status_code == 201:
        source_data = upload_resp.json()["source"]
        print(f"✅ Yükleme başarılı! ({t1-t0:.1f} saniye sürdü)")
        print(f"   - İşlenen Sayfa Sayısı: {source_data['page_count']}")
    else:
        print("❌ Yükleme başarısız:", upload_resp.text)
        return
    print()

    # 3. Soru Sorma (RAG Retrieval + LLM Generation)
    question = "Otizmli çocuklarda iletişim becerilerini geliştirmek için sınıfta hangi stratejiler kullanılmalıdır?"
    print(f"3️⃣ Soru soruluyor:\n   \"{question}\"")
    print("   Groq LLM düşünüyor...\n")
    
    query_resp = requests.post(f"{BASE_URL}/query", headers=headers, json={
        "query": question,
        "disability_type": "Otizm Spektrum Bozukluğu",
        "grade_level": 3
    })
    
    if query_resp.status_code == 200:
        data = query_resp.json()
        print("🤖 RAG YANITI:")
        print("="*60)
        print(data["answer"])
        print("="*60)
        
        print("\n📚 ATIFLAR (Kullanılan Kaynaklar):")
        for i, cit in enumerate(data.get("citations", []), 1):
            pages = ", ".join(map(str, cit["page_numbers"]))
            print(f"   {i}. {cit['source_title']} (Sayfa: {pages}) - Benzerlik Skoru: {cit['similarity_score']}")
            
        print(f"\n⏱️ Toplam Yanıt Süresi: {data.get('total_latency_ms', 0) / 1000:.2f} saniye")
    else:
        print("❌ Sorgu başarısız:", query_resp.text)

if __name__ == "__main__":
    try:
        import requests
    except ImportError:
        import subprocess
        subprocess.check_call(["pip", "install", "requests"])
        import requests
        
    run_test()
