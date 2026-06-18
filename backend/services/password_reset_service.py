import hashlib
import json
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

import models
from services.email_service import (
    is_email_configured,
    send_password_reset_email,
)
from models.email_verification import PURPOSE_PASSWORD_RESET

logger = logging.getLogger(__name__)

RESET_TOKEN_BYTES = 32
RESET_EXPIRE_MINUTES = int(
    os.getenv("PASSWORD_RESET_EXPIRE_MINUTES", "60")
)
RESEND_COOLDOWN_SECONDS = 60


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _hash_token(token: str) -> str:
    secret = os.getenv("SECRET_KEY", "")
    payload = f"{secret}:reset:{token.strip()}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def generate_reset_token() -> str:
    return secrets.token_urlsafe(RESET_TOKEN_BYTES)


def _build_reset_url(token: str) -> str:
    frontend_url = os.getenv(
        "FRONTEND_URL",
        "http://localhost:5173",
    ).rstrip("/")
    return f"{frontend_url}/reset-password?token={token}"


def _invalidate_previous(
    db: Session,
    email: str,
) -> None:
    (
        db.query(models.EmailVerification)
        .filter(
            models.EmailVerification.email == email,
            models.EmailVerification.purpose == PURPOSE_PASSWORD_RESET,
        )
        .delete(synchronize_session=False)
    )


def _find_by_token_hash(
    db: Session,
    token: str,
) -> models.EmailVerification | None:
    token_hash = _hash_token(token)
    return (
        db.query(models.EmailVerification)
        .filter(
            models.EmailVerification.purpose == PURPOSE_PASSWORD_RESET,
            models.EmailVerification.code_hash == token_hash,
        )
        .first()
    )


def _is_expired(record: models.EmailVerification) -> bool:
    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return _utcnow() > expires_at


def request_password_reset(
    db: Session,
    user: models.User,
) -> None:
    normalized_email = _normalize_email(user.email)

    latest = (
        db.query(models.EmailVerification)
        .filter(
            models.EmailVerification.email == normalized_email,
            models.EmailVerification.purpose == PURPOSE_PASSWORD_RESET,
        )
        .order_by(models.EmailVerification.created_at.desc())
        .first()
    )

    if latest:
        created_at = latest.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)

        elapsed = (_utcnow() - created_at).total_seconds()
        if elapsed < RESEND_COOLDOWN_SECONDS:
            return

    token = generate_reset_token()
    reset_url = _build_reset_url(token)

    _invalidate_previous(db, normalized_email)

    record = models.EmailVerification(
        email=normalized_email,
        purpose=PURPOSE_PASSWORD_RESET,
        code_hash=_hash_token(token),
        payload=json.dumps({"user_id": user.id}),
        user_id=user.id,
        attempts=0,
        expires_at=_utcnow() + timedelta(minutes=RESET_EXPIRE_MINUTES),
    )

    db.add(record)
    db.commit()

    display_name = user.name or user.first_name or "пользователь"

    if is_email_configured():
        try:
            send_password_reset_email(
                normalized_email,
                display_name,
                reset_url,
            )
        except Exception:
            db.delete(record)
            db.commit()
            raise
        return

    logger.warning(
        "[DEV] Password reset link for %s: %s",
        normalized_email,
        reset_url,
    )


def validate_reset_token(
    db: Session,
    token: str,
) -> dict:
    record = _find_by_token_hash(db, token)

    if not record or _is_expired(record):
        if record:
            db.delete(record)
            db.commit()
        raise ValueError("Ссылка недействительна или истекла")

    user = None
    if record.user_id:
        user = (
            db.query(models.User)
            .filter(models.User.id == record.user_id)
            .first()
        )

    if not user:
        raise ValueError("Пользователь не найден")

    return {
        "email": record.email,
        "display_name": user.name or user.first_name or "",
    }


def reset_password_with_token(
    db: Session,
    token: str,
    new_password_hash: str,
) -> models.User:
    record = _find_by_token_hash(db, token)

    if not record or _is_expired(record):
        if record:
            db.delete(record)
            db.commit()
        raise ValueError("Ссылка недействительна или истекла")

    user = (
        db.query(models.User)
        .filter(models.User.id == record.user_id)
        .first()
    )

    if not user:
        db.delete(record)
        db.commit()
        raise ValueError("Пользователь не найден")

    user.hashed_password = new_password_hash
    db.delete(record)
    db.commit()
    db.refresh(user)

    return user
