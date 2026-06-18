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
    send_verification_code_email,
)

logger = logging.getLogger(__name__)

CODE_LENGTH = 6
MAX_ATTEMPTS = 5
RESEND_COOLDOWN_SECONDS = 60
CODE_EXPIRE_MINUTES = int(
    os.getenv("VERIFICATION_CODE_EXPIRE_MINUTES", "15")
)


def generate_verification_code() -> str:
    return "".join(
        str(secrets.randbelow(10))
        for _ in range(CODE_LENGTH)
    )


def hash_verification_code(code: str) -> str:
    secret = os.getenv("SECRET_KEY", "")
    payload = f"{secret}:{code.strip()}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def verify_code_hash(code: str, code_hash: str) -> bool:
    return hash_verification_code(code) == code_hash


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _invalidate_previous(
    db: Session,
    email: str,
    purpose: str,
) -> None:
    (
        db.query(models.EmailVerification)
        .filter(
            models.EmailVerification.email == email,
            models.EmailVerification.purpose == purpose,
        )
        .delete(synchronize_session=False)
    )


def _latest_verification(
    db: Session,
    email: str,
    purpose: str,
) -> models.EmailVerification | None:
    return (
        db.query(models.EmailVerification)
        .filter(
            models.EmailVerification.email == email,
            models.EmailVerification.purpose == purpose,
        )
        .order_by(models.EmailVerification.created_at.desc())
        .first()
    )


def ensure_resend_allowed(
    db: Session,
    email: str,
    purpose: str,
) -> None:
    latest = _latest_verification(db, email, purpose)

    if not latest:
        return

    created_at = latest.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    elapsed = (_utcnow() - created_at).total_seconds()

    if elapsed < RESEND_COOLDOWN_SECONDS:
        wait_seconds = int(RESEND_COOLDOWN_SECONDS - elapsed)
        raise ValueError(
            f"Повторная отправка через {wait_seconds} сек."
        )


def create_and_send_code(
    db: Session,
    email: str,
    purpose: str,
    payload: dict | None = None,
    user_id: int | None = None,
) -> None:
    normalized_email = _normalize_email(email)
    code = generate_verification_code()

    _invalidate_previous(db, normalized_email, purpose)

    record = models.EmailVerification(
        email=normalized_email,
        purpose=purpose,
        code_hash=hash_verification_code(code),
        payload=json.dumps(payload) if payload else None,
        user_id=user_id,
        attempts=0,
        expires_at=_utcnow() + timedelta(minutes=CODE_EXPIRE_MINUTES),
    )

    db.add(record)
    db.commit()

    if is_email_configured():
        try:
            send_verification_code_email(
                normalized_email,
                code,
                purpose,
            )
        except Exception:
            db.delete(record)
            db.commit()
            raise
        return

    logger.warning(
        "[DEV] Verification code for %s (%s): %s",
        normalized_email,
        purpose,
        code,
    )


def confirm_code(
    db: Session,
    email: str,
    purpose: str,
    code: str,
) -> models.EmailVerification:
    normalized_email = _normalize_email(email)
    record = _latest_verification(
        db,
        normalized_email,
        purpose,
    )

    if not record:
        raise ValueError("Код не найден. Запросите новый.")

    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if _utcnow() > expires_at:
        db.delete(record)
        db.commit()
        raise ValueError("Срок действия кода истёк. Запросите новый.")

    if record.attempts >= MAX_ATTEMPTS:
        db.delete(record)
        db.commit()
        raise ValueError(
            "Превышено число попыток. Запросите новый код."
        )

    if not verify_code_hash(code, record.code_hash):
        record.attempts += 1
        db.commit()
        remaining = MAX_ATTEMPTS - record.attempts
        raise ValueError(
            f"Неверный код. Осталось попыток: {remaining}."
        )

    return record


def consume_verification(
    db: Session,
    record: models.EmailVerification,
) -> dict | None:
    payload = None

    if record.payload:
        payload = json.loads(record.payload)

    db.delete(record)
    db.commit()
    return payload
