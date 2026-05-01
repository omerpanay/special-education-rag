"""Yapılandırılmış JSON Loglama — structlog.

Constitution FR-021: Tüm API istekleri için yapılandırılmış JSON loglama,
RAG pipeline gecikme metrikleri ve hata oranı takibi.

Neden structlog?
- stdlib logging: print("Error: user 123 failed") → string, parse etmek zor
- structlog:     {"event": "error", "user_id": 123}  → JSON, analiz edilebilir

Her log satırı otomatik olarak şu alanları içerir:
- timestamp: ISO 8601 formatında zaman
- level: DEBUG/INFO/WARNING/ERROR
- event: Ne oldu
- correlation_id: İsteği takip etmek için benzersiz ID
"""

import logging
import sys
from typing import Any

import structlog


def setup_logging(debug: bool = False) -> None:
    """Uygulama başlangıcında bir kez çağrılır.

    structlog'u konfigure eder:
    - Development: Renkli, okunabilir konsol çıktısı
    - Production: JSON formatında log çıktısı
    """
    log_level = logging.DEBUG if debug else logging.INFO

    # structlog işlemcileri (processors) — her log mesajından geçer
    shared_processors: list[Any] = [
        structlog.contextvars.merge_contextvars,  # correlation_id gibi context vars
        structlog.stdlib.add_log_level,           # level alanını ekler
        structlog.stdlib.add_logger_name,         # logger adını ekler
        structlog.processors.TimeStamper(fmt="iso"),  # ISO 8601 timestamp
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,     # Exception bilgisini formatlar
    ]

    if debug:
        # Development: Renkli konsol çıktısı
        renderer = structlog.dev.ConsoleRenderer()
    else:
        # Production: JSON çıktısı (FR-021)
        renderer = structlog.processors.JSONRenderer()

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # stdlib logging'i de structlog formatına yönlendir
    formatter = structlog.stdlib.ProcessorFormatter(
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(log_level)

    # Gürültülü kütüphaneleri sustur
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Logger instance al.

    Kullanım:
        logger = get_logger(__name__)
        logger.info("kaynak_yuklendi", source_id=source.id, page_count=85)
    """
    return structlog.get_logger(name)
