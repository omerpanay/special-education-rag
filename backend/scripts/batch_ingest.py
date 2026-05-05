import asyncio
import os
import time
import sys
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory
from app.core.security import hash_password
from app.models.academic_source import SourceType
from app.models.teacher import Teacher
from app.rag.ingestion import ingest_pdf

SOURCES_DIR = Path(r"C:\new\Capstone-PROJECT\Sources")

def determine_source_type(filename: str) -> SourceType:
    """Dosya adına göre mantıksal bir kaynak türü tahmini yapar."""
    name_lower = filename.lower()
    if "sağlık-bakanlığı" in name_lower or "saglik-bakanligi" in name_lower or "sağlık" in name_lower:
        return SourceType.SAGLIK_BAK
    elif "meb" in name_lower or "bakanlığı" in name_lower or "bakanligi" in name_lower:
        return SourceType.MEB
    elif "tez" in name_lower:
        return SourceType.YOK_TEZ
    else:
        return SourceType.MAKALE

async def get_or_create_admin(db: AsyncSession) -> Teacher:
    """Ingestion için zorunlu olan default bir admin kullanıcısı oluşturur."""
    admin_email = "admin@edurag.com"
    stmt = select(Teacher).where(Teacher.email == admin_email)
    result = await db.execute(stmt)
    admin = result.scalar_one_or_none()

    if not admin:
        admin = Teacher(
            email=admin_email,
            hashed_password=hash_password("admin123"),
            full_name="System Admin",
            branch="Sistem"
        )
        db.add(admin)
        await db.commit()
        await db.refresh(admin)
    return admin

async def batch_ingest():
    print("🚀 Toplu PDF Vektörleştirme (Batch Ingestion) Başlıyor...\n")
    
    if not SOURCES_DIR.exists():
        print(f"❌ {SOURCES_DIR} klasörü bulunamadı.")
        return

    pdf_files = list(SOURCES_DIR.glob("*.pdf"))
    total_files = len(pdf_files)
    print(f"📂 Toplam {total_files} PDF bulundu.\n")

    success_count = 0
    error_count = 0

    try:
        async with async_session_factory() as db:
            admin = await get_or_create_admin(db)
            
            for idx, pdf_path in enumerate(pdf_files, 1):
                print(f"[{idx}/{total_files}] İşleniyor: {pdf_path.name}")
                start_time = time.time()
                try:
                    title = pdf_path.stem.replace("-", " ").replace("_", " ")
                    s_type = determine_source_type(pdf_path.name)
                    
                    await ingest_pdf(
                        file_path=str(pdf_path),
                        title=title,
                        source_type=s_type,
                        teacher_id=admin.id,
                        db=db
                    )
                    
                    elapsed = time.time() - start_time
                    if elapsed < 0.1:
                        print(f"  ⏭️  Atlandı (Daha önce yüklenmiş) ({elapsed:.2f} sn)")
                        success_count += 1
                    else:
                        print(f"  ✅ Başarılı ({elapsed:.1f} sn) [Tür: {s_type.value}]")
                        success_count += 1
                except Exception as e:
                    print(f"  ❌ Hata: {str(e)}")
                    error_count += 1

    except KeyboardInterrupt:
        print("\n\n⚠️ Kullanıcı işlemi durdurdu (Ctrl+C).")
    finally:
        print("\n🏁 Vektörleştirme İşlemi Sonuçları:")
        print(f"✅ Başarılı/Atlanan: {success_count}")
        print(f"❌ Hatalı: {error_count}")
        print(f"⏳ Toplam Kalan: {total_files - (success_count + error_count)}")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    try:
        asyncio.run(batch_ingest())
    except KeyboardInterrupt:
        sys.exit(0)
