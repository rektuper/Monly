import logging
import os
import smtplib
import socket
from email.message import EmailMessage

logger = logging.getLogger(__name__)


class EmailDeliveryError(RuntimeError):
    pass


SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
SMTP_FROM = os.getenv("SMTP_FROM", "").strip()
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "МОНЛИ").strip()
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() in {
    "1",
    "true",
    "yes",
}
SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "false").lower() in {
    "1",
    "true",
    "yes",
}


def _resolve_ssl_mode() -> bool:
    if SMTP_USE_SSL:
        return True
    if SMTP_USE_TLS and SMTP_PORT != 465:
        return False
    # Port 465 always expects implicit SSL (Yandex, Gmail, etc.)
    return SMTP_PORT == 465


def is_email_configured() -> bool:
    return bool(SMTP_HOST and SMTP_FROM)


def _build_message(
    to_email: str,
    subject: str,
    text_body: str,
) -> EmailMessage:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM}>"
    message["To"] = to_email
    message.set_content(text_body)
    return message


def send_email(
    to_email: str,
    subject: str,
    text_body: str,
) -> None:
    if not is_email_configured():
        logger.warning(
            "SMTP is not configured; email to %s was not sent",
            to_email,
        )
        raise EmailDeliveryError("Email service is not configured")

    message = _build_message(
        to_email,
        subject,
        text_body,
    )

    use_ssl = _resolve_ssl_mode()

    try:
        if use_ssl:
            with smtplib.SMTP_SSL(
                SMTP_HOST,
                SMTP_PORT,
                timeout=30,
            ) as server:
                if SMTP_USER and SMTP_PASSWORD:
                    server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(message)
            return

        with smtplib.SMTP(
            SMTP_HOST,
            SMTP_PORT,
            timeout=30,
        ) as server:
            if SMTP_USE_TLS:
                server.starttls()
            if SMTP_USER and SMTP_PASSWORD:
                server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(message)
    except (
        smtplib.SMTPException,
        socket.timeout,
        TimeoutError,
        OSError,
    ) as error:
        logger.exception(
            "Failed to send email to %s via %s:%s (ssl=%s)",
            to_email,
            SMTP_HOST,
            SMTP_PORT,
            use_ssl,
        )
        raise EmailDeliveryError(
            "Не удалось отправить письмо через SMTP"
        ) from error


def send_verification_code_email(
    to_email: str,
    code: str,
    purpose: str,
) -> None:
    if purpose == "registration":
        subject = "Код подтверждения регистрации - МОНЛИ"
        intro = (
            "Вы регистрируетесь в МОНЛИ - "
            "интеллектуальной системе управления бюджетом."
        )
    else:
        subject = "Код подтверждения смены пароля - МОНЛИ"
        intro = "Вы запросили смену пароля в МОНЛИ."

    text_body = (
        f"{intro}\n\n"
        f"Ваш код подтверждения: {code}\n\n"
        "Код действует 15 минут. "
        "Если вы не запрашивали это письмо, просто проигнорируйте его.\n\n"
        "- Команда МОНЛИ"
    )

    send_email(
        to_email,
        subject,
        text_body,
    )


def send_password_reset_email(
    to_email: str,
    display_name: str,
    reset_url: str,
) -> None:
    subject = "Восстановление пароля - МОНЛИ"

    text_body = (
        f"Здравствуйте, {display_name}!\n\n"
        "Вы запросили восстановление пароля в МОНЛИ - "
        "интеллектуальной системе управления бюджетом.\n\n"
        "Чтобы задать новый пароль, перейдите по ссылке:\n"
        f"{reset_url}\n\n"
        "Ссылка действительна 60 минут.\n\n"
        "Если вы не запрашивали восстановление пароля, "
        "просто проигнорируйте это письмо - "
        "ваш пароль останется прежним.\n\n"
        "- Команда МОНЛИ"
    )

    send_email(
        to_email,
        subject,
        text_body,
    )
