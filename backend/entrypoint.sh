#!/bin/bash
# ============================================================
# EduRAG Backend — Container Entrypoint
# ============================================================
# Çalışma sırası:
#   1. Alembic migration (DB şeması güncelle)
#   2. Uvicorn başlat
#
# set -e: Herhangi bir adım hata verirse → script durur
#         Migration hatası → container başlamaz → Render "deploy failed"
#         Bu bir özellik! Bozuk migration'la sistem açılmaz.
# ============================================================

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[EduRAG] Container başlatılıyor..."
echo "[EduRAG] $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Alembic Migration ────────────────────────────────────────
echo "[EduRAG] Veritabanı migration başlatılıyor..."
alembic upgrade head
echo "[EduRAG] ✓ Migration tamamlandı."

# ── Uvicorn Başlat ───────────────────────────────────────────
# exec: Shell yerine uvicorn'u PID 1 yapar
#   Neden önemli? Docker stop sinyali (SIGTERM) doğrudan
#   uvicorn'a gider → graceful shutdown çalışır.
#   exec olmadan: Shell PID 1, uvicorn PID 2 → SIGTERM shell'e gider,
#   uvicorn zorla öldürülür → açık DB bağlantıları kapanmaz.
#
# PORT: Render ve Railway bu env var'ı otomatik atar.
#       Yoksa 8000 default.
echo "[EduRAG] Uvicorn başlatılıyor → port ${PORT:-8000}..."
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port "${PORT:-8000}" \
    --workers 1 \
    --log-level info \
    --access-log
