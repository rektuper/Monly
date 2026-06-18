from sqlalchemy import (
    Column,
    DateTime,
    Integer,
    String,
)

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        nullable=False,
    )

    last_name = Column(
        String,
        nullable=True,
    )

    first_name = Column(
        String,
        nullable=True,
    )

    middle_name = Column(
        String,
        nullable=True,
    )

    email = Column(
        String,
        unique=True,
        nullable=False
    )

    hashed_password = Column(
        String,
        nullable=False
    )

    role = Column(
        String,
        default="user"
    )

    phone = Column(
        String,
        nullable=True,
    )

    avatar_path = Column(
        String,
        nullable=True,
    )

    avatar_updated_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )