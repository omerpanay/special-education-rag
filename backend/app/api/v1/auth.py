"""Auth API Endpoints — contracts/auth.md implementasyonu.

Router nedir?
FastAPI'de endpoint'leri gruplamak için kullanılır.
app.include_router(auth_router, prefix="/api/v1/auth")
→ Tüm endpoint'ler /api/v1/auth altında olur.

HTTPException vs ValueError:
- Service katmanı ValueError fırlatır (HTTP bilmez)
- Router katmanı bunu yakalar ve HTTPException'a çevirir
- Bu sayede service HTTP'den bağımsız kalır (Constitution İlke V)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.auth import (
    TeacherLogin,
    TeacherRegister,
    TeacherResponse,
    TokenResponse,
)
from app.services.auth_service import AuthService

from app.core.security import get_current_teacher
from app.models.teacher import Teacher

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.get(
    "/me",
    response_model=TeacherResponse,
    summary="Mevcut öğretmen bilgisi",
)
async def get_me(
    current_teacher: Teacher = Depends(get_current_teacher),
) -> TeacherResponse:
    """GET /api/v1/auth/me — JWT ile giriş yapmış öğretmen bilgisini döner."""
    return TeacherResponse.model_validate(current_teacher)



@router.post(
    "/register",
    response_model=TeacherResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Yeni öğretmen kaydı",
)
async def register(
    data: TeacherRegister,
    db: AsyncSession = Depends(get_db),
) -> TeacherResponse:
    """POST /api/v1/auth/register

    Yeni öğretmen hesabı oluşturur.
    Email benzersiz olmalı — aksi halde 409 Conflict.
    """
    try:
        service = AuthService(db)
        teacher = await service.register(data)
        return TeacherResponse.model_validate(teacher)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Öğretmen girişi",
)
async def login(
    data: TeacherLogin,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """POST /api/v1/auth/login

    Email + şifre ile giriş yapar.
    Başarılı → access_token + refresh_token döner.
    Hatalı → 401 Unauthorized.
    """
    try:
        service = AuthService(db)
        return await service.login(data.email, data.password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Token yenileme",
)
async def refresh(
    refresh_token: str,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """POST /api/v1/auth/refresh

    Refresh token ile yeni access + refresh token çifti alır.
    Süresi dolmuş veya geçersiz token → 401.
    """
    try:
        service = AuthService(db)
        return await service.refresh(refresh_token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )
