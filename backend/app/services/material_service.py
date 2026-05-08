"""Material Service — Materyal Üretim Orkestratörü.

─── MİMARİ KARAR: Neden Service katmanı? ───
LangGraph pipeline'ı çalıştırmak, DB ile senkronize etmek
ve hata yönetimini yapmak → Service'in görevi.

Endpoint sadece "başlat ve bekle" der.
Service tüm karmaşıklığı yönetir.

─── AKIŞ ───
1. Material kaydı oluştur (status=generating)
2. LangGraph pipeline'ı çalıştır
3. Başarılıysa → content + pdf_path güncelle, status=completed
4. Başarısızsa → error_message güncelle, status=failed
"""

import logging
import time
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.material import Material, MaterialStatus, MaterialType
from app.models.student import Student
from app.rag.material_graph import build_material_graph
from app.schemas.material import MaterialOut

logger = logging.getLogger("edurag.material")


class MaterialService:
    """Materyal üretim iş mantığı."""

    @staticmethod
    async def generate_material(
        db: AsyncSession,
        student_id: UUID,
        teacher_id: UUID,
        interest_topic: str,
        material_type: str = "social_story",
        title: Optional[str] = None,
        scene_count: int = 3,
    ) -> MaterialOut:
        """Materyal üretim pipeline'ını çalıştır.

        Args:
            student_id: Hangi öğrenci için
            teacher_id: Kim talep etti
            interest_topic: İlgi alanı (ör: "Uzay")
            material_type: "social_story" veya "pecs_card"
            title: Özel başlık (None → otomatik)
            scene_count: Sahne sayısı (2-6)

        Returns:
            MaterialOut: Üretilen materyal bilgisi
        """
        t0 = time.time()

        # Öğrenci bilgisini al
        student_result = await db.execute(
            select(Student).where(
                Student.id == student_id,
                Student.teacher_id == teacher_id,
            )
        )
        student = student_result.scalar_one_or_none()
        if not student:
            raise ValueError("Öğrenci bulunamadı veya erişim izniniz yok")

        # ── 1. MATERIAL KAYDI OLUŞTUR ──
        material = Material(
            student_id=student_id,
            teacher_id=teacher_id,
            material_type=MaterialType(material_type),
            title=title or f"{student.name} için {interest_topic} Öyküsü",
            interest_topic=interest_topic,
            status=MaterialStatus.GENERATING,
        )
        db.add(material)
        await db.commit()
        await db.refresh(material)

        material_id = str(material.id)

        # ── 2. LANGGRAPH PIPELINE ÇALIŞTIR ──
        try:
            graph = build_material_graph()

            initial_state = {
                "student_name": student.name,
                "interest_topic": interest_topic,
                "disability_type": student.disability_type,
                "scene_count": scene_count,
                "material_id": material_id,
            }

            # Graph'ı çalıştır — tüm node'lar sırayla çalışır
            final_state = await graph.ainvoke(initial_state)

            # ── 3. BAŞARI → DB GÜNCELLE ──
            scenes = final_state.get("scenes", [])
            image_paths = final_state.get("image_paths", [])

            # Sahnelere image path'leri ekle
            for i, scene in enumerate(scenes):
                if i < len(image_paths) and image_paths[i]:
                    scene["image_path"] = image_paths[i]

            material.content = {
                "scenes": scenes,
                "metadata": {
                    "interest_topic": interest_topic,
                    "disability_type": student.disability_type,
                    "total_scenes": len(scenes),
                    "generation_time_ms": round((time.time() - t0) * 1000, 1),
                },
            }
            material.title = final_state.get("title", material.title)
            material.pdf_path = final_state.get("pdf_path")
            material.status = MaterialStatus.COMPLETED

            logger.info(
                f"materyal_uretim_tamamlandi material_id={material_id} "
                f"sahne_sayisi={len(scenes)} sure_ms={round((time.time() - t0) * 1000, 1)}"
            )

        except Exception as e:
            # ── 4. HATA → STATUS FAILED ──
            material.status = MaterialStatus.FAILED
            material.error_message = str(e)[:500]
            logger.error(
                f"materyal_uretim_hatasi material_id={material_id} error={str(e)[:200]}"
            )

        await db.commit()
        await db.refresh(material)
        return MaterialOut.model_validate(material)

    @staticmethod
    async def get_material(
        db: AsyncSession,
        material_id: UUID,
        teacher_id: UUID,
    ) -> Material:
        """Tek bir materyali getir."""
        result = await db.execute(
            select(Material).where(
                Material.id == material_id,
                Material.teacher_id == teacher_id,
            )
        )
        material = result.scalar_one_or_none()
        if not material:
            raise ValueError("Materyal bulunamadı")
        return material

    @staticmethod
    async def get_student_materials(
        db: AsyncSession,
        student_id: UUID,
        teacher_id: UUID,
    ) -> list[Material]:
        """Öğrencinin tüm materyallerini getir."""
        # Öğrenci erişim kontrolü
        student_result = await db.execute(
            select(Student).where(
                Student.id == student_id,
                Student.teacher_id == teacher_id,
            )
        )
        if not student_result.scalar_one_or_none():
            raise ValueError("Öğrenci bulunamadı veya erişim izniniz yok")

        result = await db.execute(
            select(Material)
            .where(Material.student_id == student_id)
            .order_by(Material.created_at.desc())
        )
        return list(result.scalars().all())
