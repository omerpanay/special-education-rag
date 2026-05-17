"""RAG LCEL Zinciri (LangChain Expression Language).

─── MİMARİ KARAR: Neden LCEL? ───
LangChain'in eski API'si (LLMChain, SequentialChain) deprecate edildi.
Yeni standart LCEL — pipe operatörü (|) ile zincirleme:

    chain = prompt | llm | output_parser

Bu 3 satır şunu yapar:
1. prompt: Değişkenleri (context, question) şablona yerleştirir
2. llm: Oluşan metni Groq API'ye gönderir, yanıt alır
3. output_parser: LLM yanıtından sadece string'i çıkarır

─── NEDEN GROQ? ───
LLM Provider karşılaştırması:
  - OpenAI GPT-4: En akıllı, ama pahalı ($30/1M token)
  - Groq (seçtik): Llama 3 modellerini çok hızlı çalıştırır (LPU chip)
    → Ücretsiz tier var, ~500ms yanıt süresi, yeterli kalite
  - Ollama (local): Ücretsiz ama GPU gerektirir, yavaş
  - AWS Bedrock: Enterprise, pahalı

─── TEMPERATURE = 0.1 ───
Temperature LLM'in "yaratıcılık" seviyesidir:
  - 0.0: Deterministik, her seferinde aynı yanıt (ama bazen tekrarlayıcı)
  - 0.1 (seçtik): Çok az yaratıcılık, güvenilir yanıtlar
  - 0.7: Yaratıcı yazı için (hikaye, şiir)
  - 1.0+: Çılgın, tutarsız

Zero-Hallucination ilkesi gereği 0.1 kullanıyoruz.
Yaratıcılık istemiyoruz, doğruluk istiyoruz.
"""

from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableSerializable
from langchain_groq import ChatGroq

from app.core.config import get_settings
from app.rag.prompts import get_rag_prompt

settings = get_settings()


def get_llm() -> ChatGroq:
    """Groq LLM istemcisini ayarla.

    max_tokens=1024: Yanıt uzunluğu sınırı.
    Çok kısa (256) → cevap yarım kalır.
    Çok uzun (4096) → gereksiz maliyet + yavaşlık.
    1024 akademik yanıt için dengeli.
    """
    return ChatGroq(
        api_key=settings.groq_api_key,
        model_name=settings.llm_model,
        temperature=0.1,
        max_tokens=2048,
    )


def create_rag_chain() -> RunnableSerializable:
    """LCEL formatında RAG boru hattını oluştur.

    LCEL pipe syntax:
        prompt | llm | output_parser

    Bu aslında şuna eşdeğer (ama çok daha temiz):
        formatted = prompt.format(context=..., question=...)
        response = llm.invoke(formatted)
        text = output_parser.parse(response)

    Kullanım:
        chain = create_rag_chain()
        answer = await chain.ainvoke({
            "context": "...",
            "question": "Otizmli çocuklar için...",
            "disability_type": "Otizm",
            "grade_level": "3"
        })
    """
    prompt = get_rag_prompt()
    llm = get_llm()
    output_parser = StrOutputParser()  # AIMessage → str dönüşümü

    # LCEL: Her adımın çıktısı bir sonrakinin girdisi
    chain = prompt | llm | output_parser

    return chain
