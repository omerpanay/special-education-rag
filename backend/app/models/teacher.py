"""Teacher (Öğretmen) Modeli.

data-model.md'deki teachers tablosunun SQLAlchemy karşılığı.
TimestampMixin ile id, created_at, updated_at otomatik gelir.

SQLAlchemy 2.0 Mapped Annotations:
- Mapped[str]: Bu kolonun Python tipi str
- mapped_column(...): Veritabanı kolonu konfigürasyonu
- String(255): Veritabanında VARCHAR(255) → max 255 karakter

ORM nedir? Object-Relational Mapping
- SQL: INSERT INTO teachers (email, ...) VALUES ('a@b.com', ...)
- ORM: teacher = Teacher(email="a@b.com") → db.add(teacher)
Sınıf = Tablo, Instance = Satır, Attribute = Kolon
"""

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Teacher(Base, TimestampMixin):
    """Öğretmen tablosu.

    İlişkiler (relationships):
    - students: 1 öğretmen → N öğrenci
    - rag_responses: 1 öğretmen → N RAG yanıtı
    - feedbacks: 1 öğretmen → N geri bildirim

    Relationships lazy="selectin" ile yüklenir:
    - lazy="select": İlişkili veriye erişince sorgu atar (N+1 problemi riski)
    - lazy="selectin": Ana sorgu ile birlikte IN sorgusu atar (daha verimli)
    - Biz ilişkileri şimdilik tanımlıyoruz, ihtiyaç oldukça yükleme stratejisini ayarlarız.
    """

    __tablename__ = "teachers"

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        doc="E-posta adresi (login için)",
    )

    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Bcrypt ile hashlenmiş şifre",
    )

    full_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        doc="Ad soyad",
    )

    institution: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
        doc="Kurum adı",
    )

    branch: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        doc="Branş (ör. Sınıf Öğretmeni)",
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        doc="Hesap aktif mi",
    )

    # ── İlişkiler — Phase 4'te aktif olacak ──
    # students = relationship("Student", back_populates="teacher", lazy="selectin")
    # rag_responses = relationship("RagResponse", back_populates="teacher")
    # feedbacks = relationship("Feedback", back_populates="teacher")

    def __repr__(self) -> str:
        return f"<Teacher(id={self.id}, email={self.email})>"
