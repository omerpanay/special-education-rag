# ============================================================
# EduRAG Backend — Multi-Stage Dockerfile
# ============================================================
# Aşama 1 (builder): Tüm derleme araçları + pip install
# Aşama 2 (runtime): Sadece çalışma zamanı — küçük, güvenli image
# ============================================================

# ── Aşama 1: Builder ────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# Sistem bağımlılıkları:
#   gcc, g++     → sentence-transformers C++ derleme için
#   libpq-dev    → asyncpg/psycopg PostgreSQL header'ları
#   curl         → health check testi için
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Önce sadece bağımlılık dosyasını kopyala.
# Neden? Docker layer cache: pyproject.toml değişmezse
# pip install adımı cache'den gelir → hızlı rebuild.
COPY pyproject.toml .

# Boş app paketi oluştur (setuptools "app" paketini bulmak ister)
RUN mkdir -p app && touch app/__init__.py

# Bağımlılıkları kur — dev extras hariç (prod only)
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -e "."


# ── Aşama 2: Runtime ────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Sadece runtime için gerekli sistem kütüphanesi
# libpq5: asyncpg'nin runtime PostgreSQL bağlantısı için
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Builder'dan sadece kurulu Python paketlerini kopyala
# (gcc, g++ gibi derleme araçları runtime image'a gelmez → küçük image)
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Uygulama kodunu kopyala
COPY . .

# Çalışma dizinleri — volume mount noktaları
RUN mkdir -p /app/static/materials /app/uploads

# Entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Non-root kullanıcı — güvenlik best practice
# Root olarak çalışan container → Güvenlik açığı
RUN groupadd -r edurag && useradd -r -g edurag edurag \
    && chown -R edurag:edurag /app /app/static /app/uploads
USER edurag

# Render ve diğer PaaS $PORT env var'ı enjekte eder
EXPOSE 8000

# Health check — Docker ve Render bu endpoint'i izler
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
