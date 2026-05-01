# Feature Specification: EduRAG — Özel Eğitim RAG Platformu

**Feature Branch**: `001-edurag-platform`
**Created**: 2026-04-26
**Status**: Draft
**Input**: User description: "Özel gereksinimli öğrencilerin eğitimini desteklemek için öğretmenlere yönelik RAG tabanlı, kanıta dayalı ve kişiselleştirilmiş öğrenme platformu. 4 ana teknik katman: Öğretmen Dashboard, Hibrit RAG Hattı, Unity WebGL Entegrasyonu, Adaptif Mantık Katmanı."

## Clarifications

### Session 2026-04-26

- Q: Öğrenci verileri için hangi kişisel veri koruma seviyesi uygulanacak? → A: KVKK-uyumlu tasarım — Minimum veri toplama prensibi, açık rıza mekanizması, veri saklama süresi politikası ve veri silme hakkı uygulanır.
- Q: Platform hangi erişilebilirlik standardını hedeflemeli? → A: WCAG 2.1 AA — Ekran okuyucu uyumluluğu, klavye navigasyonu, yeterli kontrast oranları, odak göstergeleri.
- Q: Veri modeli ilişki kardinaliteleri ve öğrenci benzersizliği nasıl tanımlanmalı? → A: 1 öğretmen → N öğrenci (1:N), 1 kaynak → N chunk (1:N), 1 öğrenci → N oyun oturumu (1:N). Öğrenci benzersizliği öğretmen_id + öğrenci_adı kombinasyonu ile sağlanır.
- Q: LLM API erişilemez olduğunda sistem nasıl davranmalı? → A: Graceful degradation — Kullanıcıya açık hata mesajı gösterilir, sorgu kuyruğa alınır ve eksponansiyel geri çekilme ile yeniden denenir. RAG dışı özellikler (profil, dashboard) çalışmaya devam eder.
- Q: Gözlemlenebilirlik (observability) gereksinimleri neler olmalı? → A: Yapılandırılmış JSON loglama tüm API istekleri için, RAG pipeline gecikme metrikleri, hata oranı takibi. Tam dağıtık tracing MVP kapsamı dışında.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Öğretmen Akademik Kaynaklara Soru Sorar (Priority: P1)

Bir öğretmen, özel gereksinimli öğrencisi için pedagojik strateji arıyor. Platforma giriş yapıp, öğrencinin engel türünü ve sınıf seviyesini belirterek doğal dilde bir soru sorar. Sistem, yalnızca akademik kaynaklardan (MEB, YÖK Tez, hakemli makaleler) türetilmiş bir yanıt üretir ve her öneriyi kaynak atfıyla birlikte sunar. Kaynak bulunamazsa sistem bunu açıkça belirtir.

**Why this priority**: Platformun temel değer önerisi budur — öğretmenlerin kanıta dayalı pedagojik önerilere erişimi. Bu çalışmadan diğer tüm özellikler anlamsızdır.

**Independent Test**: Öğretmen oturum açar, "Disleksili 3. sınıf öğrencisine okuma akıcılığı nasıl kazandırılır?" sorusunu sorar, kaynak atıflı bir yanıt alır. Kaynak bulunamayan bir soru sorduğunda standart fallback mesajını görür.

**Acceptance Scenarios**:

1. **Given** sisteme akademik kaynaklar yüklenmiş, **When** öğretmen engel türü "disleksi" ve sınıf seviyesi "3" seçerek "Okuma akıcılığı stratejileri nelerdir?" sorusunu sorar, **Then** sistem en az 1 akademik kaynağa dayalı yanıt üretir ve her öneri kaynak başlığı, sayfa numarası ve benzerlik skoru ile birlikte sunulur.

2. **Given** sisteme yüklenmiş kaynaklar mevcut konuyu kapsamıyor, **When** öğretmen kapsamdışı bir soru sorar, **Then** sistem "İlgili akademik kaynak bulunamadı. Lütfen sorunuzu farklı şekilde ifade edin veya konu kapsamını daraltın." yanıtını döner ve asla tahmine dayalı bir cevap üretmez.

3. **Given** öğretmen oturum açmış, **When** engel türü veya sınıf seviyesi belirtmeden soru sorar, **Then** sistem bu alanları zorunlu kılarak doğrulama hatası gösterir.

---

### User Story 2 — Öğretmen Öğrenci Profilini Yönetir ve Gelişimi İzler (Priority: P2)

Bir öğretmen, sınıfındaki özel gereksinimli öğrencilerin profillerini oluşturur (engel türü, sınıf seviyesi, mevcut yetkinlikler). Zamanla öğrencinin etkileşim verileri birikir ve öğretmen, bir dashboard üzerinden her öğrencinin gelişim grafiklerini görselleştirerek izler.

**Why this priority**: Kişiselleştirme ve adaptif öğrenme için öğrenci profili temel altyapıdır. RAG sorgularının bağlamsal olarak zenginleştirilmesi ve oyun modülünün kalibrasyonu bu verilere bağlıdır.

**Independent Test**: Öğretmen yeni bir öğrenci profili oluşturur, engel türü ve sınıf seviyesini girer, kaydeder. Dashboard'da öğrencinin zaman içindeki etkileşim verilerini gösteren bir grafik görür.

**Acceptance Scenarios**:

1. **Given** öğretmen oturum açmış, **When** "Yeni Öğrenci Ekle" seçeneğini kullanarak isim, engel türü (disleksi/zihin yetersizliği/otizm), sınıf seviyesi ve mevcut yetkinlik notları girer, **Then** öğrenci profili oluşturulur ve öğretmenin öğrenci listesinde görünür.

2. **Given** bir öğrencinin en az 5 etkileşim kaydı birikmiş, **When** öğretmen o öğrencinin profil sayfasına gider, **Then** zaman serisi grafiği ile doğru cevap oranı, ortalama yanıt süresi ve oturum başına ilerleme trendi görselleştirilir.

3. **Given** öğretmen bir RAG yanıtını okumuş, **When** yanıtı "Faydalı" veya "Faydalı Değil" olarak değerlendirir, **Then** bu geri bildirim kaydedilir ve ilgili öğrenci profilindeki kaynaklara notlanır.

---

### User Story 3 — Öğrenci Eğitici Oyunla Etkileşir (Priority: P3)

Öğrenci, web tarayıcısında çalışan eğitici bir oyun oynamaya başlar. Oyun, öğrencinin engel türüne ve mevcut performansına göre zorluk seviyesini dinamik olarak ayarlar. Oyun sırasında toplanan performans verileri (yanıt süresi, doğruluk oranı, hata türleri) otomatik olarak kaydedilir.

**Why this priority**: Oyun modülü, öğrencinin aktif katılımını sağlayan ana etkileşim aracıdır. Ancak backend RAG ve profil altyapısı olmadan oyun kalibre edilemez.

**Independent Test**: Öğrenci bir oyun oturumu başlatır, ilk sorularda performansına göre zorluk ayarlanır. Oturum bittiğinde performans verileri öğretmenin dashboard'unda görünür.

**Acceptance Scenarios**:

1. **Given** öğrenci profili "disleksi, 3. sınıf" olarak tanımlanmış ve oyun başlatılmış, **When** öğrenci ilk 5 sorunun 4'ünü doğru yanıtlar, **Then** oyun bir sonraki seviyede zorluk derecesini artırır (ör. daha uzun kelimeler, daha kısa süre sınırı).

2. **Given** öğrenci arka arkaya 3 yanlış yanıt verir, **When** sistem bu durumu algılar, **Then** zorluk seviyesi düşürülür ve destekleyici ipuçları gösterilir.

3. **Given** bir oyun oturumu tamamlanmış, **When** öğretmen dashboard'a gider, **Then** o oturumun detaylı performans raporu (toplam süre, doğru/yanlış sayısı, zorluk değişim geçmişi) görünür.

---

### User Story 4 — Adaptif Öğrenme Döngüsü (Priority: P4)

Öğrencinin oyun performans verileri ve öğretmenin RAG yanıt geri bildirimleri birleştirilir. Sistem, bir sonraki RAG sorgusu yapıldığında öğrencinin mevcut performans bağlamını dikkate alır; böylece öneriler kişiselleştirilir. Aynı zamanda oyun modülünün başlangıç parametreleri de güncellenmiş performans verilerine göre ayarlanır.

**Why this priority**: Tüm katmanları birleştiren kapalı döngü (closed-loop) mekanizmasıdır. Önceki 3 hikâye bağımsız değer sunabilirken, bu hikâye hepsini entegre eder ve tam kişiselleştirmeyi sağlar.

**Independent Test**: Öğrencinin oyun verisi biriktikten sonra öğretmen aynı soruyu tekrar sorar; yanıt öğrencinin performans bağlamına göre farklılaşmış öneriler içerir.

**Acceptance Scenarios**:

1. **Given** öğrencinin 10 oyun oturumu birikmiş ve doğruluk oranı %40'tan %75'e yükselmiş, **When** öğretmen o öğrenci bağlamında "Bir sonraki adım ne olmalı?" sorusunu sorar, **Then** sistem bu ilerleme verisini bağlam olarak kullanarak daha ileri seviye stratejiler önerir.

2. **Given** öğretmen bir RAG yanıtını "Faydalı Değil" olarak işaretlemiş, **When** sistem aynı konu hakkında yeni bir sorgu alır, **Then** daha önce "Faydalı Değil" olarak işaretlenen kaynak chunk'ları retrieval sıralamasında düşürülür.

3. **Given** öğrencinin performans verileri güncellenmiş, **When** yeni bir oyun oturumu başlatılır, **Then** oyun başlangıç zorluk seviyesini son 3 oturumun ortalamasına göre kalibre eder.

---

### Edge Cases

- Öğretmen aynı öğrenci için aynı anda birden fazla oturumda çalışırsa ne olur? → Sistem en son güncellenen oturumu referans alır; eş zamanlı yazma çakışması son yazma kazanır (last-write-wins) politikasıyla çözülür.
- Veritabanında hiç kaynak yüklenmemişken soru sorulursa ne olur? → Sistem standart fallback mesajı döner ve yönetici panelinde "Kaynak veritabanı boş" uyarısı gösterir.
- Unity WebGL modülü yüklenemezse ne olur? → Frontend kullanıcıya anlamlı bir hata mesajı gösterir, oyun dışındaki tüm özellikler çalışmaya devam eder.
- Embedding modeli güncellendikten sonra mevcut vektörlerle uyumsuzluk olursa ne olur? → Sistem embedding model versiyonunu kontrol eder; uyumsuzluk tespit edildiğinde re-indexing pipeline'ı tetiklenir.
- Öğretmen geri bildirim vermeden uzun süre geçerse ne olur? → Geri bildirim isteğe bağlıdır; sistem geri bildirim olmadan da çalışır, ancak adaptif optimizasyon kısıtlı kalır.
- Öğretmen veya veli öğrencinin tüm verilerinin silinmesini talep ederse ne olur? → Sistem, ilgili öğrenciye ait profil, oyun oturumları, performans metrikleri ve geri bildirimleri kalıcı olarak siler. Silme işlemi denetim kaydı (audit log) ile belgelenir.
- LLM API sağlayıcısı (OpenAI vb.) erişilemez olursa ne olur? → Sistem kullanıcıya "Yapay zeka servisi geçici olarak kullanılamıyor, sorgunuz kuyruğa alındı" mesajı gösterir. Sorgu kuyruğa alınır ve eksponansiyel geri çekilme ile yeniden denenir. Profil yönetimi, dashboard ve oyun modülü etkilenmeden çalışmaya devam eder.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistem, öğretmenlerin kayıt olup oturum açmasını sağlamak ZORUNDADIR. Kimlik doğrulama güvenli oturum yönetimi ile yapılmalıdır.
- **FR-002**: Sistem, öğrenci profili oluşturma ve düzenleme işlevselliği sunmak ZORUNDADIR. Profil; öğrenci adı, engel türü (disleksi, zihin yetersizliği, otizm), sınıf seviyesi (1-12) ve serbest metin notlar alanı içermelidir.
- **FR-003**: Sistem, akademik kaynakları (PDF formatında) yükleyebilmek ve otomatik olarak anlamsal parçalara ayırarak vektör veritabanında indekslemek ZORUNDADIR.
- **FR-004**: Sistem, öğretmenin doğal dilde sorduğu soruya yalnızca vektör veritabanındaki akademik kaynaklara dayalı yanıt üretmek ZORUNDADIR. Yanıt her zaman kaynak atfı içermelidir.
- **FR-005**: Sistem, vektör benzerlik araması ile tam metin aramasını birleştiren hibrit arama stratejisi uygulamak ZORUNDADIR.
- **FR-006**: Sistem, arama sonuçlarını çeşitlendirmek için MMR (Maximal Marginal Relevance) veya eşdeğer bir yöntem kullanmak ZORUNDADIR.
- **FR-007**: Sistem, öğretmenin RAG yanıtlarını "Faydalı" veya "Faydalı Değil" olarak değerlendirebileceği bir geri bildirim mekanizması sunmak ZORUNDADIR.
- **FR-008**: Sistem, öğrenci bazında zaman serisi gelişim grafikleri (doğruluk oranı, yanıt süresi, oturum ilerlemesi) görselleştirebilmek ZORUNDADIR.
- **FR-009**: Sistem, WebGL tabanlı eğitici oyunu web tarayıcısında çalıştırabilmek ve oyun ile backend arasında veri iletişimi sağlamak ZORUNDADIR.
- **FR-010**: Oyun modülü, öğrencinin anlık performansına göre zorluk seviyesini dinamik olarak ayarlamak ZORUNDADIR.
- **FR-011**: Sistem, oyun oturumu performans verilerini (doğru/yanlış sayısı, yanıt süresi, zorluk değişimleri) kaydetmek ve öğretmen dashboard'unda raporlamak ZORUNDADIR.
- **FR-012**: Sistem, öğrencinin birikmiş performans verilerini RAG sorgusuna bağlam olarak ekleyerek kişiselleştirilmiş öneriler üretebilmek ZORUNDADIR.
- **FR-013**: Sistem, öğretmenin olumsuz geri bildirim verdiği kaynakları sonraki retrieval işlemlerinde sıralama dışına almak veya düşürmek ZORUNDADIR.
- **FR-014**: Sistem, kaynak yükleme sırasında kaynak türü doğrulaması yapmalı ve yalnızca onaylı türlerdeki (MEB, YÖK Tez, hakemli makale, Sağlık Bakanlığı) kaynakları kabul etmek ZORUNDADIR.
- **FR-015**: Sistem, kullanıcı girdilerini LLM'ye göndermeden önce temizlemek (sanitize) ve prompt injection saldırılarına karşı koruma sağlamak ZORUNDADIR.
- **FR-016**: Sistem, KVKK (6698 sayılı Kişisel Verilerin Korunması Kanunu) gerekliliklerine uygun olarak minimum veri toplama prensibi uygulamak ZORUNDADIR. Yalnızca eğitim hedefleri için zorunlu olan veriler toplanmalıdır.
- **FR-017**: Sistem, öğrenci verilerinin toplanması öncesinde öğretmen/veli açık rıza mekanizması sunmak ZORUNDADIR. Rıza kaydı denetlenebilir formatta saklanmalıdır.
- **FR-018**: Sistem, veri saklama süresi politikası uygulamak ve talep üzerine öğrenci verilerini tamamen silme (veri unutulma hakkı) işlevselliği sunmak ZORUNDADIR.
- **FR-019**: Kullanıcı arayüzü WCAG 2.1 AA erişilebilirlik standardına uygun olmak ZORUNDADIR. Ekran okuyucu uyumluluğu, klavye navigasyonu, minimum 4.5:1 kontrast oranı ve görünür odak göstergeleri sağlanmalıdır.
- **FR-020**: LLM API erişilemez olduğunda sistem graceful degradation uygulamak ZORUNDADIR. Kullanıcıya açık hata mesajı gösterilmeli, sorgu kuyruğa alınmalı ve eksponansiyel geri çekilme ile yeniden denenmelidir.
- **FR-021**: Sistem, tüm API istekleri için yapılandırılmış JSON loglama, RAG pipeline gecikme metrikleri ve hata oranı takibi sağlamak ZORUNDADIR.

### Key Entities

- **Öğretmen (Teacher)**: Platforma giriş yapan, öğrenci profili oluşturan, RAG sorgusu yapan ve geri bildirim veren birincil kullanıcı. Temel nitelikler: isim, e-posta, kurum, branş. İlişki: 1 öğretmen → N öğrenci.
- **Öğrenci (Student)**: Öğretmen tarafından profili oluşturulan, oyunla etkileşen birey. Temel nitelikler: isim, engel türü, sınıf seviyesi, yetkinlik notları. Benzersizlik: öğretmen_id + öğrenci_adı kombinasyonu. İlişki: 1 öğrenci → N oyun oturumu.
- **Akademik Kaynak (Academic Source)**: Sisteme yüklenen PDF dokümanı. Temel nitelikler: başlık, kaynak türü, yükleme tarihi, sayfa sayısı.
- **Kaynak Parçası (Source Chunk)**: Akademik kaynağın anlamsal olarak bölünmüş parçası. Temel nitelikler: metin içeriği, vektör temsili, kaynak referansı, sayfa numarası, chunk indeksi.
- **RAG Yanıtı (RAG Response)**: Sistem tarafından üretilen, kaynak atıflı pedagojik öneri. Temel nitelikler: yanıt metni, kullanılan kaynaklar listesi, benzerlik skorları.
- **Geri Bildirim (Feedback)**: Öğretmenin bir RAG yanıtına verdiği değerlendirme. Temel nitelikler: yanıt referansı, değerlendirme (faydalı/faydalı değil), tarih.
- **Oyun Oturumu (Game Session)**: Öğrencinin tek bir oyun oturumunda biriken performans verisi. Temel nitelikler: başlangıç/bitiş zamanı, soru sayısı, doğru/yanlış, zorluk değişim geçmişi.
- **Performans Metriği (Performance Metric)**: Öğrencinin birikmiş öğrenme verileri. Temel nitelikler: doğruluk oranı trendi, ortalama yanıt süresi, oturum sayısı, ilerleme yüzdesi.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Öğretmenler, bir pedagojik soruya 10 saniye içinde kaynak atıflı yanıt alabilmelidir.
- **SC-002**: Veritabanında cevabı olmayan sorularda sistem %100 oranında fallback mesajı dönmelidir; hiçbir koşulda tahmine dayalı yanıt üretilmemelidir.
- **SC-003**: Üretilen her yanıt en az 1 akademik kaynak atfı içermelidir; atıfsız yanıt oranı %0 olmalıdır.
- **SC-004**: Hibrit arama (vektör + tam metin), sadece vektör aramasına kıyasla ilgili sonuç bulma oranını en az %20 artırmalıdır.
- **SC-005**: Öğretmenlerin %80'i, platform aracılığıyla eriştikleri önerileri "güvenilir ve uygulanabilir" olarak değerlendirmelidir.
- **SC-006**: Oyun modülünün zorluk ayarlama algoritması, öğrencinin performansına 3 soru içinde tepki verebilmelidir.
- **SC-007**: Platforma en az 50 öğretmen ve 200 öğrenci eş zamanlı bağlanabilmelidir; yanıt süreleri %10'dan fazla artmamalıdır.
- **SC-008**: Adaptif döngü aktifleştirildiğinde, öğrencilerin doğru yanıt oranında 10 oturum içinde en az %15 iyileşme gözlemlenmelidir.
- **SC-009**: Öğretmen profil oluşturmayı 2 dakika içinde tamamlayabilmelidir.
- **SC-010**: Kaynak yükleme ve indeksleme işlemi 100 sayfalık bir PDF için 60 saniyeyi aşmamalıdır.
- **SC-011**: Kullanıcı arayüzü WCAG 2.1 AA denetim aracıyla (ör. axe, Lighthouse) tarandığında kritik erişilebilirlik hatası bulunmamalıdır.
- **SC-012**: LLM API kesintisi sırasında profil yönetimi, dashboard ve oyun modülü kesintisiz çalışmaya devam etmelidir.

## Assumptions

- Öğretmenler stabil internet bağlantısına sahip modern web tarayıcıları (Chrome, Firefox, Edge) kullanmaktadır.
- WebGL desteği olan tarayıcılar hedeflenmektedir; mobil tarayıcı desteği ilk sürümde kapsam dışıdır.
- Sisteme yüklenecek akademik kaynaklar Türkçe dilindedir ve PDF formatındadır.
- LLM sağlayıcısı olarak OpenAI API veya eşdeğer bir servis kullanılacaktır; model seçimi konfigürasyon ile değiştirilebilir olacaktır.
- İlk sürümde öğrenci doğrudan platforma giriş yapmaz; oyun oturumları öğretmen tarafından başlatılır.
- Embedding modeli olarak Türkçe desteği olan multilingual bir model (ör. multilingual-e5-large) kullanılacaktır.
- Unity oyun modülü ayrı bir ekip tarafından geliştirilip WebGL olarak derlenecek ve frontend'e entegre edilecektir.
- İlk MVP'de tek bir oyun türü (kelime tanıma/okuma akıcılığı) hedeflenmektedir; ek oyun türleri sonraki sürümlerde eklenecektir.
