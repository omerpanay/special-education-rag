"""MEB BEP Formatına Uygun IEP Prompt Template'leri.

Kaynaklar:
  - MEB Özel Eğitim ve Rehberlik Hizmetleri Genel Müdürlüğü
  - "BEP: Tüm Öğretmenler İçin Yol Haritası" Kılavuzu (2022)
  - BEP_Word.docx (EK-1 Örnek Format)

BEP Dosyası 5 Bölümden Oluşur:
  I   - Öğrenci Bilgileri
  II  - Eğitsel Performans Formu
  III - Bireyselleştirilmiş Eğitim Planı (Uzun/Kısa Dönemli Amaçlar)
  IV  - BEP Geliştirme Birim Kararları
  V   - BEP Birim Üyeleri (Manuel — AI üretmez)
"""

from langchain_core.prompts import ChatPromptTemplate

IEP_SYSTEM_TEMPLATE = """\
Sen MEB (Millî Eğitim Bakanlığı) BEP formatını bilen, deneyimli bir özel eğitim uzmanısın.
Görevin, öğrenci profili ve akademik kaynaklara dayanarak MEB formatına uygun
Bireyselleştirilmiş Eğitim Programı (BEP) taslağı üretmektir.

### BEP YAZIM KURALLARI ###

1. AMAÇ YAZIM KURALLARI:
   - Amaçlar gözlemlenebilir, ölçülebilir ve net olmalıdır
   - Geniş zaman kipi kullanılır: "yapar", "eder", "sayar", "okur"
   - YANLIŞ: "Okuma becerisini geliştirebilme" (belirsiz, ölçülemez)
   - DOĞRU: "İki heceli kelimeleri doğru okur" (net, ölçülebilir)
   - Herkesin aynı şeyi anlaması gerekir

2. ÖLÇÜT YAZIM KURALLARI:
   - Deneme/başarı formatında yazılır
   - Örnek: "5/5 (%100)", "4/5 (%80)", "3/5 (%60)"
   - Kazandırılmak istenen davranış kaç denemede başarılı sayılacak

3. PERFORMANS DÜZEYİ:
   - Öğrencinin YAPABİLDİKLERİ yazılır
   - Yapamadıkları burada belirtilmez, onlar hedef olarak planlanır

4. GELİŞİM ALANLARI (engel türüne göre seç):
   - Disleksi: Türkçe (okuma-yazma), ince motor, dikkat
   - Otizm: İletişim, sosyal beceri, davranış düzenleme
   - Zihinsel yetersizlik: Öz bakım, iletişim, akademik, günlük yaşam
   - İşitme yetersizliği: Alıcı/ifade edici dil, akademik
   - DEHB: Dikkat, sosyal beceri, akademik yapılandırma

5. YÖNTEM VE TEKNİKLER:
   - Doğrudan öğretim, model olma, ipuçlu öğretim
   - Tekrarlı okuma, çok duyulu yaklaşım
   - Görsel destekler, somutlaştırma

### ÇIKTI FORMATI ###
Yanıtını MUTLAKA aşağıdaki JSON formatında ver. Başka metin ekleme.
"""

IEP_HUMAN_TEMPLATE = """\
Aşağıdaki öğrenci profili için MEB formatına uygun BEP taslağı üret.

### ÖĞRENCİ PROFİLİ ###
Ad-Soyad: {student_name}
Eğitsel Tanı: {disability_type}
Sınıf Seviyesi: {grade_level}. Sınıf
Öğretmen Yetkinlik Notları: {competency_notes}
{additional_context}

### AKADEMİK KAYNAKLARDAN ALINAN BİLGİ ###
{rag_context}

### ODAK ALANLARI ###
{focus_areas}

### ÇIKTI ###
Aşağıdaki JSON yapısında yanıt ver. Sadece JSON döndür, başka metin yazma:

{{
  "student_info": {{
    "name": "{student_name}",
    "grade_level": {grade_level},
    "disability_type": "{disability_type}",
    "educational_diagnosis": "<Türkçe eğitsel tanı açıklaması>",
    "environment_adjustments": "<Eğitim ortamı düzenlemeleri önerisi>"
  }},
  "performance_assessment": {{
    "development_history": "<Kısa gelişim öyküsü>",
    "areas": [
      {{
        "area_name": "<Gelişim Alanı/Ders>",
        "performance_level": "<Öğrencinin bu alandaki mevcut yapabildiği becerileri>",
        "behavior_problems": null
      }}
    ]
  }},
  "education_plan": [
    {{
      "development_area": "<Gelişim Alanı/Ders>",
      "long_term_goal": "<Uzun dönemli amaç — geniş zaman kipi ile>",
      "short_term_goals": [
        {{
          "goal": "<Kısa dönemli amaç — gözlemlenebilir, ölçülebilir>",
          "behaviors": ["<Hedef davranış 1>", "<Hedef davranış 2>"],
          "criterion": "<Ölçüt: ör. 4/5 (%80)>",
          "methods": ["<Yöntem 1>", "<Yöntem 2>"],
          "materials": ["<Materyal 1>", "<Materyal 2>"],
          "start_date": "<YYYY-AA-GG>",
          "end_date": "<YYYY-AA-GG>",
          "evaluation_method": "<Ölçme-değerlendirme yöntemi>",
          "evaluation_dates": "<Değerlendirme sıklığı>",
          "result": null
        }}
      ],
      "environment_adjustments": "<Bu alana özgü ortam düzenlemesi>"
    }}
  ],
  "unit_decisions": {{
    "school_services": [
      {{
        "service_type": "<Hizmet türü>",
        "area": "<Gelişim alanı/ders>",
        "weekly_hours": <saat>,
        "responsible": "<Sorumlu>"
      }}
    ],
    "family_info_frequency": "<Bilgilendirme sıklığı>",
    "family_info_method": "<Bilgilendirme yöntemi>",
    "family_education": true,
    "family_education_method": "<Aile eğitimi yöntemi>"
  }}
}}
"""


def get_iep_prompt() -> ChatPromptTemplate:
    """MEB BEP formatına uygun IEP prompt template'i döndürür."""
    return ChatPromptTemplate.from_messages([
        ("system", IEP_SYSTEM_TEMPLATE),
        ("human", IEP_HUMAN_TEMPLATE),
    ])
