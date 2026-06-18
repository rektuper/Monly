from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Boolean,
)

from sqlalchemy.sql import func

from sqlalchemy.orm import relationship

from database import Base


class Transaction(Base):

    __tablename__ = "transactions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id")
    )

    created_by_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    payer_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    receiver_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    family_id = Column(
        Integer,
        ForeignKey("families.id"),
        nullable=True,
        index=True,
    )

    amount = Column(
        Float,
        nullable=False
    )

    type = Column(
        String,
        nullable=False
    )

    category_id = Column(
        Integer,
        ForeignKey(
            "user_categories.id"
        )
    )

    category = relationship(
        "UserCategory",
        back_populates="transactions"
    )

    description = Column(
        String,
        nullable=True
    )

    source = Column(
        String,
        default="manual"
    )

    fingerprint = Column(
        String,
        unique=True,
        nullable=True,
        index=True
    )

    transaction_date = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    is_deleted = Column(
        Boolean,
        default=False
    )

    bank_category = Column(
        String,
        nullable=True,
    )

    ai_confidence = Column(
        Float,
        nullable=True,
    )

    ai_source = Column(
        String,
        nullable=True,
    )

    needs_review = Column(
        Boolean,
        default=False,
    )