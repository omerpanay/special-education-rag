"""Auth Pydantic Schemas — Request/Response Validasyonu.

Constitution İlkesi IV: Strict Type Safety
Pydantic, API'ye gelen her veriyi doğrular:
- Tip kontrolü: email str mi? grade_level int mi?
- Kısıtlama: Şifre en az 8 karakter mi?
- Otomatik hata mesajı: Yanlış veri gelirse 422 döner

Model vs Schema farkı:
- Model (SQLAlchemy): Veritabanı tablosunu temsil eder
- Schema (Pydantic): API request/response formatını tanımlar

Neden ikisi ayrı?
- Kullanıcıya hashed_password göstermek istemezsin
- Kayıt sırasında şifre düz metin gelir ama DB'de hash tutulur
- Farklı endpoint'ler farklı alanlar döner
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class TeacherRegister(BaseModel):
    """Kayıt formu — kullanıcıdan gelen veri.

    EmailStr: Pydantic'in özel tipi — email formatını doğrular.
    Field(min_length=8): Minimum 8 karakter şifre zorunluluğu.
    """

    email: EmailStr = Field(..., description="E-posta adresi")
    password: str = Field(..., min_length=8, description="Şifre (min 8 karakter)")
    full_name: str = Field(..., min_length=2, max_length=100, description="Ad soyad")
    institution: str | None = Field(None, max_length=200, description="Kurum adı")
    branch: str | None = Field(None, max_length=100, description="Branş")


class TeacherLogin(BaseModel):
    """Login formu."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """JWT token çifti — login başarılı olunca döner.

    contracts/auth.md'deki response formatına birebir uygun.
    """

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Access token ömrü (saniye)")


class TeacherResponse(BaseModel):
    """Öğretmen bilgisi — API response.

    model_config: ORM modelden otomatik dönüşüm sağlar.
    Örnek: Teacher(email="a@b.com") → TeacherResponse(email="a@b.com")
    hashed_password buraya eklenmez → kullanıcıya gösterilmez.
    """

    id: UUID
    email: str
    full_name: str
    institution: str | None = None
    branch: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
