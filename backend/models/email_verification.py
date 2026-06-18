from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Text,
)
from sqlalchemy.sql import func

from database import Base

PURPOSE_REGISTRATION = "registration"
PURPOSE_PASSWORD_CHANGE = "password_change"
PURPOSE_PASSWORD_RESET = "password_reset"


class EmailVerification(Base):
    __tablename__ = "email_verifications"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    email = Column(
        String,
        nullable=False,
        index=True,
    )

    purpose = Column(
        String,
        nullable=False,
        index=True,
    )

    code_hash = Column(
        String,
        nullable=False,
    )

    payload = Column(
        Text,
        nullable=True,
    )

    user_id = Column(
        Integer,
        nullable=True,
        index=True,
    )

    attempts = Column(
        Integer,
        default=0,
        nullable=False,
    )

    expires_at = Column(
        DateTime(timezone=True),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
