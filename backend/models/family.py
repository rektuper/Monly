import secrets
import string

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base

PERMISSION_OWNER = "owner"
PERMISSION_PARTICIPANT = "participant"
PERMISSION_OBSERVER = "observer"


def generate_invite_token() -> str:
    return secrets.token_urlsafe(24)


def generate_access_code() -> str:
    alphabet = (
        string.ascii_uppercase
        + string.digits
    )
    alphabet = (
        alphabet.replace("0", "")
        .replace("O", "")
        .replace("1", "")
        .replace("I", "")
    )
    return "".join(
        secrets.choice(alphabet)
        for _ in range(6)
    )


class Family(Base):
    __tablename__ = "families"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    currency = Column(String, nullable=False, default="RUB")
    initial_balance = Column(Float, nullable=False, default=0.0)
    created_by_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    members = relationship(
        "FamilyMember",
        back_populates="family",
        cascade="all, delete-orphan",
    )
    invites = relationship(
        "FamilyInvite",
        back_populates="family",
        cascade="all, delete-orphan",
    )


class FamilyMember(Base):
    __tablename__ = "family_members"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_family_members_user"),
    )

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(
        Integer,
        ForeignKey("families.id"),
        nullable=False,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )
    family_role = Column(String, nullable=False, default="участник")
    permission_role = Column(
        String,
        nullable=False,
        default=PERMISSION_PARTICIPANT,
    )
    joined_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    family = relationship("Family", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])


class FamilyInvite(Base):
    __tablename__ = "family_invites"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(
        Integer,
        ForeignKey("families.id"),
        nullable=False,
    )
    token = Column(
        String,
        unique=True,
        nullable=False,
        index=True,
        default=generate_invite_token,
    )
    access_code = Column(
        String,
        unique=True,
        nullable=False,
        index=True,
        default=generate_access_code,
    )
    created_by_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    family = relationship("Family", back_populates="invites")
