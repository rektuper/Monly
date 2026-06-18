import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas

from database import SessionLocal
from core.dependencies import get_current_user
from utils.user_profile import (
    serialize_user,
    format_full_name,
)
from core.security import (
    hash_password,
    verify_password,
    create_access_token,
)
from services.email_service import EmailDeliveryError
from services.verification_service import (
    create_and_send_code,
    confirm_code,
    consume_verification,
    ensure_resend_allowed,
)
from services.password_reset_service import (
    request_password_reset,
    validate_reset_token,
    reset_password_with_token,
)
from models.email_verification import (
    PURPOSE_REGISTRATION,
    PURPOSE_PASSWORD_CHANGE,
)

router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


def _seed_default_categories(
    db: Session,
    user_id: int,
) -> None:
    default_expense = [
        "Продукты",
        "Транспорт",
        "Кафе",
        "Развлечения",
        "Подписки",
        "Одежда",
        "Здоровье",
    ]

    default_income = [
        "Пополнение",
        "Зарплата",
        "Фриланс",
        "Подарок",
        "Возврат",
    ]

    for category in default_expense:
        db.add(
            models.UserCategory(
                user_id=user_id,
                name=category,
                type="expense",
            )
        )

    for category in default_income:
        db.add(
            models.UserCategory(
                user_id=user_id,
                name=category,
                type="income",
            )
        )


def _create_user_from_payload(
    db: Session,
    payload: dict,
    email: str,
) -> models.User:
    middle_name = (payload.get("middle_name") or "").strip() or None

    new_user = models.User(
        last_name=payload["last_name"].strip(),
        first_name=payload["first_name"].strip(),
        middle_name=middle_name,
        name=format_full_name(
            payload["last_name"],
            payload["first_name"],
            middle_name,
        ),
        email=email,
        hashed_password=payload["hashed_password"],
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    _seed_default_categories(db, new_user.id)
    db.commit()

    return new_user


@router.post(
    "/register/request",
    response_model=schemas.MessageResponse,
)
def register_request(
    user: schemas.RegisterRequest,
    db: Session = Depends(get_db),
):
    email = user.email.strip().lower()

    existing_user = (
        db.query(models.User)
        .filter(models.User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already exists",
        )

    middle_name = (user.middle_name or "").strip() or None

    payload = {
        "last_name": user.last_name.strip(),
        "first_name": user.first_name.strip(),
        "middle_name": middle_name,
        "hashed_password": hash_password(user.password),
    }

    try:
        ensure_resend_allowed(
            db,
            email,
            PURPOSE_REGISTRATION,
        )
        create_and_send_code(
            db,
            email,
            PURPOSE_REGISTRATION,
            payload=payload,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=429,
            detail=str(error),
        ) from error
    except RuntimeError:
        raise HTTPException(
            status_code=503,
            detail="Сервис отправки писем временно недоступен",
        ) from None
    except EmailDeliveryError:
        raise HTTPException(
            status_code=503,
            detail="Не удалось отправить письмо. Проверьте SMTP-настройки.",
        ) from None

    return {
        "message": "Код подтверждения отправлен на email",
    }


@router.post(
    "/register/confirm",
    response_model=schemas.RegisterConfirmResponse,
)
def register_confirm(
    body: schemas.VerifyCodeRequest,
    db: Session = Depends(get_db),
):
    email = body.email.strip().lower()

    existing_user = (
        db.query(models.User)
        .filter(models.User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already exists",
        )

    try:
        record = confirm_code(
            db,
            email,
            PURPOSE_REGISTRATION,
            body.code,
        )
        payload = consume_verification(db, record)
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    if not payload:
        raise HTTPException(
            status_code=400,
            detail="Данные регистрации не найдены",
        )

    new_user = _create_user_from_payload(
        db,
        payload,
        email,
    )

    access_token = create_access_token({
        "sub": new_user.email,
        "role": new_user.role,
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": serialize_user(new_user),
    }


@router.post(
    "/register/resend",
    response_model=schemas.MessageResponse,
)
def register_resend(
    body: schemas.ResendCodeRequest,
    db: Session = Depends(get_db),
):
    if body.purpose != PURPOSE_REGISTRATION:
        raise HTTPException(
            status_code=400,
            detail="Invalid purpose",
        )

    email = body.email.strip().lower()

    record = (
        db.query(models.EmailVerification)
        .filter(
            models.EmailVerification.email == email,
            models.EmailVerification.purpose == PURPOSE_REGISTRATION,
        )
        .order_by(models.EmailVerification.created_at.desc())
        .first()
    )

    if not record or not record.payload:
        raise HTTPException(
            status_code=404,
            detail="Запрос регистрации не найден",
        )

    try:
        ensure_resend_allowed(
            db,
            email,
            PURPOSE_REGISTRATION,
        )
        create_and_send_code(
            db,
            email,
            PURPOSE_REGISTRATION,
            payload=json.loads(record.payload),
        )
    except ValueError as error:
        raise HTTPException(
            status_code=429,
            detail=str(error),
        ) from error
    except RuntimeError:
        raise HTTPException(
            status_code=503,
            detail="Сервис отправки писем временно недоступен",
        ) from None
    except EmailDeliveryError:
        raise HTTPException(
            status_code=503,
            detail="Не удалось отправить письмо. Проверьте SMTP-настройки.",
        ) from None

    return {
        "message": "Код отправлен повторно",
    }


@router.post(
    "/password/request",
    response_model=schemas.MessageResponse,
)
def password_change_request(
    body: schemas.PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    valid_password = verify_password(
        body.current_password,
        current_user.hashed_password,
    )

    if not valid_password:
        raise HTTPException(
            status_code=400,
            detail="Неверный текущий пароль",
        )

    if verify_password(
        body.new_password,
        current_user.hashed_password,
    ):
        raise HTTPException(
            status_code=400,
            detail="Новый пароль должен отличаться от текущего",
        )

    payload = {
        "hashed_password": hash_password(body.new_password),
    }

    try:
        ensure_resend_allowed(
            db,
            current_user.email,
            PURPOSE_PASSWORD_CHANGE,
        )
        create_and_send_code(
            db,
            current_user.email,
            PURPOSE_PASSWORD_CHANGE,
            payload=payload,
            user_id=current_user.id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=429,
            detail=str(error),
        ) from error
    except RuntimeError:
        raise HTTPException(
            status_code=503,
            detail="Сервис отправки писем временно недоступен",
        ) from None
    except EmailDeliveryError:
        raise HTTPException(
            status_code=503,
            detail="Не удалось отправить письмо. Проверьте SMTP-настройки.",
        ) from None

    return {
        "message": "Код подтверждения отправлен на email",
    }


@router.post(
    "/password/confirm",
    response_model=schemas.MessageResponse,
)
def password_change_confirm(
    body: schemas.PasswordChangeConfirmRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        record = confirm_code(
            db,
            current_user.email,
            PURPOSE_PASSWORD_CHANGE,
            body.code,
        )

        if record.user_id and record.user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Код не принадлежит текущему пользователю",
            )

        payload = consume_verification(db, record)
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    if not payload or "hashed_password" not in payload:
        raise HTTPException(
            status_code=400,
            detail="Данные смены пароля не найдены",
        )

    current_user.hashed_password = payload["hashed_password"]
    db.commit()

    return {
        "message": "Пароль успешно изменён",
    }


@router.post(
    "/password/resend",
    response_model=schemas.MessageResponse,
)
def password_change_resend(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    record = (
        db.query(models.EmailVerification)
        .filter(
            models.EmailVerification.email == current_user.email,
            models.EmailVerification.purpose == PURPOSE_PASSWORD_CHANGE,
        )
        .order_by(models.EmailVerification.created_at.desc())
        .first()
    )

    if not record or not record.payload:
        raise HTTPException(
            status_code=404,
            detail="Запрос смены пароля не найден",
        )

    try:
        ensure_resend_allowed(
            db,
            current_user.email,
            PURPOSE_PASSWORD_CHANGE,
        )
        create_and_send_code(
            db,
            current_user.email,
            PURPOSE_PASSWORD_CHANGE,
            payload=json.loads(record.payload),
            user_id=current_user.id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=429,
            detail=str(error),
        ) from error
    except RuntimeError:
        raise HTTPException(
            status_code=503,
            detail="Сервис отправки писем временно недоступен",
        ) from None
    except EmailDeliveryError:
        raise HTTPException(
            status_code=503,
            detail="Не удалось отправить письмо. Проверьте SMTP-настройки.",
        ) from None

    return {
        "message": "Код отправлен повторно",
    }


@router.post(
    "/forgot-password",
    response_model=schemas.MessageResponse,
)
def forgot_password(
    body: schemas.ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    email = body.email.strip().lower()

    user = (
        db.query(models.User)
        .filter(models.User.email == email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Аккаунт с таким email не найден",
        )

    try:
        request_password_reset(db, user)
    except EmailDeliveryError:
        raise HTTPException(
            status_code=503,
            detail="Не удалось отправить письмо. Попробуйте позже.",
        ) from None

    return {
        "message": "Отправили ссылку для восстановления пароля на ваш email",
    }


@router.get(
    "/reset-password/validate",
    response_model=schemas.ResetPasswordValidateResponse,
)
def reset_password_validate(
    token: str,
    db: Session = Depends(get_db),
):
    try:
        data = validate_reset_token(db, token)
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    return {
        "valid": True,
        "email": data["email"],
        "display_name": data["display_name"],
    }


@router.post(
    "/reset-password",
    response_model=schemas.ResetPasswordResponse,
)
def reset_password(
    body: schemas.ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    try:
        user = reset_password_with_token(
            db,
            body.token,
            hash_password(body.password),
        )
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    access_token = create_access_token({
        "sub": user.email,
        "role": user.role,
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "message": "Пароль успешно изменён",
    }


@router.post(
    "/register",
    response_model=schemas.UserResponse,
)
def register(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
):
    existing_user = (
        db.query(models.User)
        .filter(models.User.email == user.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already exists",
        )

    hashed_password = hash_password(
        user.password
    )

    middle_name = (user.middle_name or "").strip() or None

    new_user = models.User(
        last_name=user.last_name.strip(),
        first_name=user.first_name.strip(),
        middle_name=middle_name,
        name=format_full_name(
            user.last_name,
            user.first_name,
            middle_name,
        ),
        email=user.email,
        hashed_password=hashed_password,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    _seed_default_categories(db, new_user.id)
    db.commit()

    return serialize_user(new_user)


@router.post(
    "/login",
    response_model=schemas.Token,
)
def login(
    user: schemas.UserLogin,
    db: Session = Depends(get_db),
):
    existing_user = (
        db.query(models.User)
        .filter(models.User.email == user.email)
        .first()
    )

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials",
        )

    valid_password = verify_password(
        user.password,
        existing_user.hashed_password,
    )

    if not valid_password:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials",
        )

    access_token = create_access_token({
        "sub": existing_user.email,
        "role": existing_user.role,
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.get(
    "/me",
    response_model=schemas.UserResponse,
)
def get_me(
    current_user: models.User = Depends(
        get_current_user
    ),
):
    return serialize_user(current_user)
