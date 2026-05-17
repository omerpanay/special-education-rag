"""SENSEI Production Logging Configuration.

Structured JSON logging for production-grade traceability.
Prepares for LangSmith integration via trace_id propagation.

Usage:
    from app.core.logging_config import setup_logging
    setup_logging()
"""

import logging
import logging.config
import sys
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone

# Context variable for request trace ID (propagated to LangSmith)
request_trace_id: ContextVar[str] = ContextVar(
    "request_trace_id", default=""
)


class StructuredFormatter(logging.Formatter):
    """JSON-structured log formatter for production traceability."""

    def format(self, record: logging.LogRecord) -> str:
        import json

        trace_id = request_trace_id.get("") or str(uuid.uuid4())[:8]

        log_entry = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
            "trace_id": trace_id,
            "module": record.module,
            "line": record.lineno,
        }

        # Merge extra fields (e.g., student_id, teacher_id, etc.)
        for key, val in record.__dict__.items():
            if key not in (
                "msg", "args", "levelname", "levelno", "pathname",
                "filename", "module", "exc_info", "exc_text", "stack_info",
                "lineno", "funcName", "created", "msecs", "relativeCreated",
                "thread", "threadName", "processName", "process", "message",
                "name", "taskName",
            ):
                if not key.startswith("_"):
                    log_entry[key] = val

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, ensure_ascii=False, default=str)


def setup_logging(level: str = "INFO") -> None:
    """Configure structured logging for SENSEI backend."""

    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Remove existing handlers
    root_logger.handlers.clear()

    # Console handler with structured format
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(StructuredFormatter())
    root_logger.addHandler(console_handler)

    # Suppress noisy third-party loggers
    for noisy in ["httpx", "httpcore", "uvicorn.access"]:
        logging.getLogger(noisy).setLevel(logging.WARNING)

    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    logger = logging.getLogger("sensei.startup")
    logger.info(
        "logging_initialized",
        extra={"log_level": level, "mode": "production"},
    )
