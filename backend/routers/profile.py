from datetime import datetime, timezone
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
)

from sqlalchemy.orm import Session

from database import SessionLocal
from core.dependencies import get_current_user
from utils.user_profile import (
    serialize_user,
    sync_user_display_name,
)

import models
import schemas

router = APIRouter(
    prefix="/profile",
    tags=["Profile"],
)

AVATAR_DIR = (
    Path(__file__).resolve().parent.parent / "uploads" / "avatars"
)
AVATAR_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/octet-stream",
}
MAX_AVATAR_BYTES = 5 * 1024 * 1024


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _detect_image_type(content: bytes, content_type: str | None) -> str:
    if content[:3] == b"\xff\xd8\xff":
        return "image/jpeg"

    if content[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"

    if content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "image/webp"

    if content_type in ALLOWED_TYPES and content_type.startswith("image/"):
        return content_type

    return "image/jpeg"


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def _get_user_in_session(
    db: Session,
    current_user: models.User,
) -> models.User:
    user = (
        db.query(models.User)
        .filter(models.User.id == current_user.id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    return user


@router.get("", response_model=schemas.UserProfileResponse)
def get_profile(
    current_user: models.User = Depends(get_current_user),
):
    return serialize_user(current_user)


@router.patch("", response_model=schemas.UserProfileResponse)
def update_profile(
    payload: schemas.ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user = _get_user_in_session(db, current_user)

    if payload.last_name is not None:
        user.last_name = payload.last_name.strip()

    if payload.first_name is not None:
        user.first_name = payload.first_name.strip()

    if payload.middle_name is not None:
        middle = payload.middle_name.strip()
        user.middle_name = middle or None

    if payload.phone is not None:
        phone = payload.phone.strip()
        user.phone = phone or None

    sync_user_display_name(user)

    db.commit()
    db.refresh(user)

    return serialize_user(user)


@router.post("/avatar", response_model=schemas.UserProfileResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    content = await file.read()

    if len(content) > MAX_AVATAR_BYTES:
        raise HTTPException(
            status_code=400,
            detail="Файл слишком большой (макс. 5 МБ)",
        )

    if len(content) < 16:
        raise HTTPException(
            status_code=400,
            detail="Файл пустой или повреждён",
        )

    resolved_type = _detect_image_type(
        content,
        file.content_type,
    )

    extension = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    }.get(resolved_type, "jpg")

    user = _get_user_in_session(db, current_user)

    filename = f"user_{user.id}.{extension}"
    file_path = AVATAR_DIR / filename

    if user.avatar_path:
        old_path = AVATAR_DIR / user.avatar_path

        if old_path.exists() and old_path != file_path:
            old_path.unlink(missing_ok=True)

    file_path.write_bytes(content)

    user.avatar_path = filename
    user.avatar_updated_at = _utcnow()
    db.commit()
    db.refresh(user)

    return serialize_user(user)


@router.delete("/avatar", response_model=schemas.UserProfileResponse)
def delete_avatar(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user = _get_user_in_session(db, current_user)

    if user.avatar_path:
        file_path = AVATAR_DIR / user.avatar_path
        file_path.unlink(missing_ok=True)
        user.avatar_path = None
        user.avatar_updated_at = None
        db.commit()
        db.refresh(user)

    return serialize_user(user)
