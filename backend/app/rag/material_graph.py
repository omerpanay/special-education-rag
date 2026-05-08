"""Material Graph — LangGraph Multi-Agent Materyal Üretici.

─── MİMARİ KARAR: Neden LangGraph? ───
Basit bir sequential chain yetmez çünkü:
1. Her adım farklı bir "uzman" gerektiriyor (Writer, Prompt Engineer, Image)
2. Hata durumunda belirli adımlara geri dönmek gerekebilir
3. State (durum) yönetimi karmaşık — her sahne bağımsız image generation

LangGraph StateGraph, her node'u (ajan) bağımsız çalıştırır ve
state'i node'lar arasında paylaşır.

─── AKIŞ ───
writer_node → prompt_node → image_node → pdf_node
     ↓            ↓              ↓            ↓
   Hikaye      Görsel         Görseller     PDF
   yazar      promptları       üretir       oluşturur
              yazar

─── STATE YAPISI ───
MaterialState: TypedDict ile tanımlı, tüm node'lar okur/yazar.
"""

import json
import logging
from typing import Any, Optional
from uuid import uuid4

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langgraph.graph import END, StateGraph
from typing_extensions import TypedDict

from app.core.config import get_settings
from app.services.image_generator import generate_images_batch
from app.services.pdf_builder import build_social_story_pdf, ensure_materials_dir

settings = get_settings()
logger = logging.getLogger("edurag.material_graph")


# ═══════════════════════════════════════════
# STATE DEFINITION
# ═══════════════════════════════════════════

class MaterialState(TypedDict, total=False):
    """LangGraph state — tüm node'lar bu state'i paylaşır.

    total=False: Tüm alanlar opsiyonel (başlangıçta boş olabilir).
    """
    # Giriş parametreleri (kullanıcıdan gelen)
    student_name: str
    interest_topic: str
    disability_type: str
    scene_count: int
    material_id: str

    # Writer Agent çıktısı
    scenes: list[dict]   # [{"order": 1, "text": "..."}, ...]
    title: str

    # Prompt Agent çıktısı
    image_prompts: list[str]

    # Image Agent çıktısı
    image_paths: list[str]

    # PDF Agent çıktısı
    pdf_path: Optional[str]

    # Hata takibi
    error: Optional[str]


# ═══════════════════════════════════════════
# NODE FUNCTIONS (Her biri bir "Ajan")
# ═══════════════════════════════════════════

def _get_llm() -> ChatGroq:
    """Paylaşılan LLM instance'ı (Groq)."""
    return ChatGroq(
        api_key=settings.groq_api_key,
        model_name=settings.llm_model,
        temperature=0.7,    # Yaratıcı içerik → biraz daha yüksek temperature
        max_tokens=2000,
    )


async def writer_node(state: MaterialState) -> dict[str, Any]:
    """Writer Agent — Sosyal öykü yazar.

    Giriş: interest_topic, disability_type, scene_count, student_name
    Çıkış: scenes (list[dict]), title
    """
    logger.info(f"writer_agent_basladi topic={state.get('interest_topic')}")

    prompt = ChatPromptTemplate.from_messages([
        ("system", """Sen özel eğitim alanında uzman bir çocuk hikayesi yazarısın.
Verilen ilgi alanına göre basit, anlaşılır ve eğitici bir sosyal öykü yaz.

KURALLAR:
1. Dil basit ve net olsun (özel eğitim öğrencisi için)
2. Her sahne 2-3 cümle olsun
3. Hikaye pozitif ve destekleyici olsun
4. Öğrencinin adını kullan
5. Engel türüne uygun davranış modelleri göster

ÇIKTI FORMATI (Sadece JSON, başka bir şey yazma):
{{
  "title": "<Hikaye başlığı>",
  "scenes": [
    {{"order": 1, "text": "<Sahne 1 metni>"}},
    {{"order": 2, "text": "<Sahne 2 metni>"}},
    ...
  ]
}}"""),
        ("human", """Öğrenci Adı: {student_name}
İlgi Alanı: {interest_topic}
Engel Türü: {disability_type}
Sahne Sayısı: {scene_count}

Lütfen bu bilgilere göre bir sosyal öykü yaz."""),
    ])

    chain = prompt | _get_llm() | StrOutputParser()
    response = await chain.ainvoke({
        "student_name": state.get("student_name", "Öğrenci"),
        "interest_topic": state.get("interest_topic", "Doğa"),
        "disability_type": state.get("disability_type", "Belirtilmedi"),
        "scene_count": state.get("scene_count", 3),
    })

    # JSON parse
    try:
        clean = response.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1].rsplit("```", 1)[0]
        data = json.loads(clean)
        return {
            "scenes": data.get("scenes", []),
            "title": data.get("title", f"{state.get('interest_topic', 'Hikaye')} Öyküsü"),
        }
    except (json.JSONDecodeError, IndexError):
        logger.warning(f"writer_json_parse_hatasi response={response[:200]}")
        return {
            "scenes": [{"order": 1, "text": response[:500]}],
            "title": f"{state.get('interest_topic', 'Hikaye')} Öyküsü",
        }


async def prompt_node(state: MaterialState) -> dict[str, Any]:
    """Prompt Agent — Her sahne için İngilizce görsel promptu yazar.

    Giriş: scenes
    Çıkış: image_prompts
    """
    logger.info(f"prompt_agent_basladi sahne_sayisi={len(state.get('scenes', []))}")

    prompt = ChatPromptTemplate.from_messages([
        ("system", """Sen bir görsel üretim prompt mühendisisin.
Verilen sahne metinleri için çocuk-dostu, renkli, cartoon tarzı
İNGİLİZCE görsel üretim promptları yaz.

KURALLAR:
1. Prompt İngilizce olmalı (görsel üretim modelleri İngilizce çalışır)
2. "cute cartoon style, colorful, child-friendly" her prompt'a ekle
3. Korku, şiddet veya karanlık unsurlar KULLANMA
4. Her prompt 1-2 cümle olsun

ÇIKTI FORMATI (Sadece JSON array, başka bir şey yazma):
["prompt 1", "prompt 2", ...]"""),
        ("human", "Sahneler:\n{scenes_text}"),
    ])

    scenes = state.get("scenes", [])
    scenes_text = "\n".join(
        f"Sahne {s.get('order', i+1)}: {s.get('text', '')}"
        for i, s in enumerate(scenes)
    )

    chain = prompt | _get_llm() | StrOutputParser()
    response = await chain.ainvoke({"scenes_text": scenes_text})

    try:
        clean = response.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1].rsplit("```", 1)[0]
        prompts = json.loads(clean)
        if isinstance(prompts, list):
            return {"image_prompts": prompts}
    except (json.JSONDecodeError, IndexError):
        pass

    # Fallback: Her sahne için generic prompt
    fallback_prompts = [
        f"cute cartoon illustration of a child with {state.get('interest_topic', 'nature')}, "
        f"colorful, child-friendly, educational"
        for _ in scenes
    ]
    return {"image_prompts": fallback_prompts}


async def image_node(state: MaterialState) -> dict[str, Any]:
    """Image Agent — Görselleri paralel + staggered üretir.

    Giriş: image_prompts, material_id
    Çıkış: image_paths

    Neden generate_images_batch?
    Sıralı üretim: 4 sahne × 15sn = 60sn
    Staggered paralel: 3×5sn offset + ~15sn = ~30sn
    """
    material_id = state.get("material_id", str(uuid4()))
    material_dir = ensure_materials_dir(material_id)
    image_prompts = state.get("image_prompts", [])

    logger.info(f"image_agent_basladi prompt_sayisi={len(image_prompts)}")

    # Tüm görselleri paralel + staggered üret
    results = await generate_images_batch(image_prompts, stagger_delay=5.0)

    image_paths = []
    for idx, image_bytes in enumerate(results):
        if image_bytes:
            image_path = str(material_dir / f"scene_{idx + 1}.jpg")
            with open(image_path, "wb") as f:
                f.write(image_bytes)
            image_paths.append(image_path)
            logger.info(f"gorsel_kaydedildi sahne={idx + 1} boyut={len(image_bytes)}")
        else:
            image_paths.append("")
            logger.warning(f"gorsel_uretilemedi sahne={idx + 1}")

    successful = sum(1 for p in image_paths if p)
    logger.info(f"image_agent_bitti basarili={successful}/{len(image_prompts)}")
    return {"image_paths": image_paths}


async def pdf_node(state: MaterialState) -> dict[str, Any]:
    """PDF Agent — Metin + görselleri PDF'e birleştirir.

    Giriş: scenes, image_paths, title, material_id, student_name
    Çıkış: pdf_path
    """
    logger.info("pdf_agent_basladi")

    scenes = state.get("scenes", [])
    image_paths = state.get("image_paths", [])

    # Sahnelere görsel yollarını ekle
    enriched_scenes = []
    for i, scene in enumerate(scenes):
        enriched = dict(scene)
        if i < len(image_paths) and image_paths[i]:
            enriched["image_path"] = image_paths[i]
        enriched_scenes.append(enriched)

    pdf_path = await build_social_story_pdf(
        material_id=state.get("material_id", str(uuid4())),
        title=state.get("title", "Sosyal Öykü"),
        scenes=enriched_scenes,
        student_name=state.get("student_name", ""),
    )

    return {"pdf_path": pdf_path}


# ═══════════════════════════════════════════
# GRAPH CONSTRUCTION
# ═══════════════════════════════════════════

def build_material_graph() -> StateGraph:
    """LangGraph state machine oluştur.

    Akış: writer → prompt_engineer → image_generator → pdf_builder → END

    Her node async çalışır. Hata olursa state["error"] set edilir
    ve graph durur.
    """
    graph = StateGraph(MaterialState)

    # Node'ları ekle
    graph.add_node("writer", writer_node)
    graph.add_node("prompt_engineer", prompt_node)
    graph.add_node("image_generator", image_node)
    graph.add_node("pdf_builder", pdf_node)

    # Edge'leri tanımla (sıralı akış)
    graph.set_entry_point("writer")
    graph.add_edge("writer", "prompt_engineer")
    graph.add_edge("prompt_engineer", "image_generator")
    graph.add_edge("image_generator", "pdf_builder")
    graph.add_edge("pdf_builder", END)

    return graph.compile()
