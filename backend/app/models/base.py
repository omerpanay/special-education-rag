"""SQLAlchemy Base Model — Tüm modellerin ortak atasıdır.

Her tabloda tekrarlanan alanları (id, created_at, updated_at) burada
bir kez tanımlıyoruz. Tüm modeller Base'den miras alır.

Mimari Karar: UUID vs Auto-Increment ID
- UUID: Dağıtık sistemlerde çakışma olmaz, URL'de tahmin edilemez
- Auto-Increment: Sıralı, daha küçük, daha hızlı JOIN
- Biz UUID seçtik çünkü güvenlik (URL tahmin edilemezliği) ve
  gelecekte dağıtık mimari olasılığı.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Tüm SQLAlchemy modellerinin ata sınıfı.

    DeclarativeBase, SQLAlchemy 2.0'ın modern yaklaşımıdır.
    Eski deklaratif stil: declarative_base() fonksiyonu.
    Yeni stil: class tabanlı, type hints ile uyumlu.
    """

    pass


class TimestampMixin:
    """Zaman damgası mixin — id, created_at, updated_at.

    Mixin nedir? Bir sınıfa ek özellikler katan,
    tek başına kullanılmayan yardımcı sınıf.

    Kullanım:
        class Teacher(Base, TimestampMixin):
            __tablename__ = "teachers"
            email: Mapped[str] = mapped_column(...)
    """

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        doc="Benzersiz tanımlayıcı (UUID v4)",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        doc="Kaydın oluşturulma zamanı",
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        doc="Kaydın son güncellenme zamanı",
    )
