"""PDF Builder — Eğitim Materyali PDF Oluşturucu.

─── MİMARİ KARAR: Neden reportlab yerine HTML-to-PDF? ───
reportlab güçlü ama API'si karmaşık. Basit alternatif:
1. Jinja2 ile HTML template render et
2. HTML'den PDF üret

Ancak weasyprint/wkhtmltopdf bağımlılık sorunları yaratabilir.
Bu yüzden pure-Python reportlab kullanıyoruz.

Şu an: Basit metin+resim layout (MVP).
İleride: Profesyonel template'ler eklenebilir.

NOT: reportlab kurulumu gerekir: pip install reportlab
"""

import io
import logging
import os
from pathlib import Path
from typing import Optional

logger = logging.getLogger("edurag.pdf_builder")

# Statik dosya dizini
MATERIALS_DIR = Path(__file__).parent.parent.parent / "static" / "materials"


def ensure_materials_dir(material_id: str) -> Path:
    """Materyal dosyaları için dizin oluştur."""
    material_dir = MATERIALS_DIR / material_id
    material_dir.mkdir(parents=True, exist_ok=True)
    return material_dir


async def build_social_story_pdf(
    material_id: str,
    title: str,
    scenes: list[dict],
    student_name: str = "",
) -> Optional[str]:
    """Sosyal öykü PDF'i oluştur.

    Args:
        material_id: Benzersiz materyal ID'si (dosya adı için)
        title: Hikaye başlığı
        scenes: [{"order": 1, "text": "...", "image_path": "..."}]
        student_name: Öğrenci adı (kapak sayfası için)

    Returns:
        PDF dosya yolu (string) veya None (hata durumunda)
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            Image,
            PageBreak,
            Paragraph,
            SimpleDocTemplate,
            Spacer,
        )
    except ImportError:
        logger.error("reportlab_kurulu_degil - pip install reportlab")
        return None

    try:
        material_dir = ensure_materials_dir(material_id)
        pdf_path = material_dir / f"{material_id}.pdf"

        doc = SimpleDocTemplate(
            str(pdf_path),
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=2 * cm,
            bottomMargin=2 * cm,
        )

        # ── Stiller ──
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "CustomTitle",
            parent=styles["Title"],
            fontSize=24,
            spaceAfter=30,
            alignment=1,  # Center
        )
        scene_title_style = ParagraphStyle(
            "SceneTitle",
            parent=styles["Heading2"],
            fontSize=16,
            spaceAfter=12,
        )
        body_style = ParagraphStyle(
            "SceneBody",
            parent=styles["Normal"],
            fontSize=14,
            leading=20,  # Satır aralığı — çocuklar için geniş
            spaceAfter=20,
        )
        footer_style = ParagraphStyle(
            "Footer",
            parent=styles["Normal"],
            fontSize=10,
            alignment=1,
            textColor="grey",
        )

        # ── İçerik Oluştur ──
        story = []

        # Kapak sayfası
        story.append(Spacer(1, 4 * cm))
        story.append(Paragraph(title, title_style))
        if student_name:
            story.append(Paragraph(
                f"<i>{student_name} için hazırlanmıştır</i>",
                footer_style,
            ))
        story.append(Spacer(1, 2 * cm))
        story.append(Paragraph(
            "EduRAG Özel Eğitim Platformu tarafından üretilmiştir.",
            footer_style,
        ))
        story.append(PageBreak())

        # Sahneler
        for scene in scenes:
            order = scene.get("order", 0)
            text = scene.get("text", "")
            image_path = scene.get("image_path", "")

            story.append(Paragraph(f"Sahne {order}", scene_title_style))

            # Görsel varsa ekle
            if image_path and os.path.exists(image_path):
                try:
                    img = Image(image_path, width=14 * cm, height=10 * cm)
                    img.hAlign = "CENTER"
                    story.append(img)
                    story.append(Spacer(1, 0.5 * cm))
                except Exception as img_err:
                    logger.warning(f"pdf_gorsel_hatasi error={img_err}")

            # Metin
            story.append(Paragraph(text, body_style))
            story.append(Spacer(1, 1 * cm))

            # Her sahne yeni sayfada (son sahne hariç)
            if order < len(scenes):
                story.append(PageBreak())

        # PDF oluştur
        doc.build(story)

        logger.info(
            f"pdf_olusturuldu path={pdf_path} sahne_sayisi={len(scenes)}"
        )
        return str(pdf_path)

    except Exception as e:
        logger.error(f"pdf_olusturma_hatasi error={e}")
        return None
