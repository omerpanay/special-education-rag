"""Auth Service — İş Mantığı Katmanı.

Service katmanı neden var?
- Endpoint (router): Sadece HTTP'yi anlar — request alır, response döner
- Service: İş kurallarını uygular — "bu email zaten var mı?", "şifre doğru mu?"
- Model: Sadece veritabanı işlemlerini bilir

Bu ayırım sayesinde:
1. Aynı iş mantığını farklı endpoint'lerde kullanabilirsin
2. Test etmesi kolay — HTTP'ye ihtiyacın yok, sadece service'i çağır
3. Tek sorumluluk: Her katman bir iş yapar

Constitution İlkesi V: Modular Separation of Concerns
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.teacher import Teacher
from app.schemas.auth import TeacherRegister, TokenResponse

logger = get_logger(__name__)


class AuthService:
    """Authentication iş mantığı.

    Neden class-based service?
    - db session'ı constructor'da alır → her metoda ayrı geçmek gerekmez
    - Test'te mock db session inject edilebilir
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def register(self, data: TeacherRegister) -> Teacher:
        """Yeni öğretmen kaydı.

        Akış:
        1. Email daha önce kullanılmış mı? → 409 Conflict
        2. Şifreyi hashle (düz metin DB'ye asla yazılmaz!)
        3. Teacher nesnesi oluştur ve DB'ye ekle
        4. Commit → DB'ye yaz
        """
        # 1. Duplikasyon kontrolü
        existing = await self.db.execute(
            select(Teacher).where(Teacher.email == data.email)
        )
        if existing.scalar_one_or_none() is not None:
            raise ValueError("Bu e-posta adresi zaten kayıtlı")

        # 2-3. Hash + nesne oluşturma
        teacher = Teacher(
            email=data.email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            institution=data.institution,
            branch=data.branch,
        )
        self.db.add(teacher)
        await self.db.commit()
        await self.db.refresh(teacher)

        logger.info("ogretmen_kaydedildi", teacher_id=str(teacher.id), email=teacher.email)
        return teacher

    async def login(self, email: str, password: str) -> TokenResponse:
        """Login — email + şifre doğrulama.

        Akış:
        1. Email ile öğretmeni bul
        2. Bulunamazsa veya şifre yanlışsa → hata
           (Güvenlik: "Email yanlış" veya "Şifre yanlış" ayrı söylenmez!)
        3. Token çifti üret ve döndür
        """
        result = await self.db.execute(
            select(Teacher).where(Teacher.email == email)
        )
        teacher = result.scalar_one_or_none()

        # Güvenlik: Email ve şifre hatası aynı mesajla döner
        # Saldırgan hangi email'lerin kayıtlı olduğunu anlayamaz
        if teacher is None or not verify_password(password, teacher.hashed_password):
            raise ValueError("E-posta veya şifre hatalı")

        if not teacher.is_active:
            raise ValueError("Hesap deaktif edilmiş")

        # Token üretimi
        token_data = {"sub": str(teacher.id)}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        logger.info("ogretmen_giris_yapti", teacher_id=str(teacher.id))

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=900,  # 15 dakika = 900 saniye
        )

    async def refresh(self, refresh_token_str: str) -> TokenResponse:
        """Refresh token ile yeni token çifti al.

        Neden gerekli?
        - Access token 15dk sonra süresi doluyor
        - Kullanıcı tekrar login olmasın diye refresh token kullanılır
        - Refresh token ile yeni access + refresh token çifti üretilir
        """
        payload = decode_token(refresh_token_str)

        if payload.get("type") != "refresh":
            raise ValueError("Geçersiz token türü")

        teacher_id = payload.get("sub")
        if teacher_id is None:
            raise ValueError("Token'da kullanıcı bilgisi bulunamadı")

        # Teacher'ın hâlâ aktif olduğunu doğrula
        result = await self.db.execute(
            select(Teacher).where(Teacher.id == teacher_id)
        )
        teacher = result.scalar_one_or_none()
        if teacher is None or not teacher.is_active:
            raise ValueError("Kullanıcı bulunamadı veya hesap deaktif")

        token_data = {"sub": str(teacher.id)}
        new_access = create_access_token(token_data)
        new_refresh = create_refresh_token(token_data)

        return TokenResponse(
            access_token=new_access,
            refresh_token=new_refresh,
            expires_in=900,
        )
