from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.entities import Admin

settings = get_settings()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError:
        return None


async def authenticate_admin(db: AsyncSession, username: str, password: str) -> Optional[Admin]:
    result = await db.execute(select(Admin).where(Admin.username == username))
    admin = result.scalar_one_or_none()

    # Сначала проверяем существующего админа
    if admin and verify_password(password, admin.hashed_password):
        return admin

    # Если админ не найден или пароль неверный, проверяем суперадмина
    # Проверяем только username, чтобы обновить пароль если нужно
    if username == settings.superadmin_username:
        admin = await ensure_super_admin(db)
        # Если пароль совпадает с настройками или хеш неверный - обновляем
        if password == settings.superadmin_password or not verify_password(password, admin.hashed_password):
            admin.hashed_password = get_password_hash(settings.superadmin_password)
            admin.is_superadmin = True
            await db.commit()
            await db.refresh(admin)
        # Проверяем пароль после обновления
        if verify_password(password, admin.hashed_password):
            return admin

    return None


async def get_admin_by_id(db: AsyncSession, admin_id: str) -> Optional[Admin]:
    result = await db.execute(select(Admin).where(Admin.id == admin_id))
    return result.scalar_one_or_none()


async def create_admin(
    db: AsyncSession,
    username: str,
    email: str,
    password: str,
    is_superadmin: bool = False
) -> Admin:
    admin = Admin(
        username=username,
        email=email,
        hashed_password=get_password_hash(password),
        is_superadmin=is_superadmin
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    return admin


async def ensure_super_admin(db: AsyncSession) -> Admin:
    result = await db.execute(select(Admin).where(Admin.username == settings.superadmin_username))
    admin = result.scalar_one_or_none()
    if admin:
        return admin
    return await create_admin(
        db,
        username=settings.superadmin_username,
        email=settings.superadmin_email,
        password=settings.superadmin_password,
        is_superadmin=True,
    )
