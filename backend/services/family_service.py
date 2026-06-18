import os

from fastapi import HTTPException
from sqlalchemy.orm import Session

import models
from models.family import (
    FamilyInvite,
    PERMISSION_OBSERVER,
    PERMISSION_OWNER,
    PERMISSION_PARTICIPANT,
)
from utils.user_profile import serialize_user

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173",
).rstrip("/")

def get_membership(
    db: Session,
    user_id: int,
) -> models.FamilyMember | None:
    return (
        db.query(models.FamilyMember)
        .filter(models.FamilyMember.user_id == user_id)
        .first()
    )


def get_family_member_user_ids(
    db: Session,
    family_id: int,
) -> list[int]:
    rows = (
        db.query(models.FamilyMember.user_id)
        .filter(models.FamilyMember.family_id == family_id)
        .all()
    )
    return [row[0] for row in rows]


def require_membership(
    db: Session,
    user_id: int,
) -> models.FamilyMember:
    membership = get_membership(db, user_id)

    if not membership:
        raise HTTPException(
            status_code=404,
            detail="You are not in a family group",
        )

    return membership


def require_owner(
    db: Session,
    user_id: int,
) -> models.FamilyMember:
    membership = require_membership(db, user_id)

    if membership.permission_role != PERMISSION_OWNER:
        raise HTTPException(
            status_code=403,
            detail="Only the budget owner can perform this action",
        )

    return membership


def can_write_transactions(
    membership: models.FamilyMember | None,
) -> bool:
    if not membership:
        return True

    return membership.permission_role in (
        PERMISSION_OWNER,
        PERMISSION_PARTICIPANT,
    )


def can_modify_transaction(
    db: Session,
    membership: models.FamilyMember | None,
    current_user_id: int,
    transaction: models.Transaction,
) -> bool:
    if transaction.user_id == current_user_id:
        if not membership:
            return True
        return can_write_transactions(membership)

    if not membership:
        return False

    if membership.permission_role == PERMISSION_OBSERVER:
        return False

    member_ids = get_family_member_user_ids(
        db,
        membership.family_id,
    )

    return transaction.user_id in member_ids


def get_member_family_role(
    db: Session,
    family_id: int,
    user_id: int,
) -> str | None:
    member = (
        db.query(models.FamilyMember)
        .filter(
            models.FamilyMember.family_id == family_id,
            models.FamilyMember.user_id == user_id,
        )
        .first()
    )
    return member.family_role if member else None


def serialize_user_brief(
    db: Session,
    user_id: int | None,
    family_id: int | None = None,
) -> dict | None:
    if not user_id:
        return None

    user = (
        db.query(models.User)
        .filter(models.User.id == user_id)
        .first()
    )

    if not user:
        return None

    profile = serialize_user(user)

    return {
        "user_id": user_id,
        "name": profile.get("name"),
        "avatar_url": profile.get("avatar_url"),
        "family_role": (
            get_member_family_role(db, family_id, user_id)
            if family_id
            else None
        ),
    }


def serialize_member(
    db: Session,
    member: models.FamilyMember,
) -> dict:
    user = (
        db.query(models.User)
        .filter(models.User.id == member.user_id)
        .first()
    )

    profile = serialize_user(user) if user else {}

    return {
        "user_id": member.user_id,
        "family_role": member.family_role,
        "permission_role": member.permission_role,
        "joined_at": member.joined_at,
        "name": profile.get("name"),
        "avatar_url": profile.get("avatar_url"),
        "email": profile.get("email"),
        "is_owner": (
            member.permission_role == PERMISSION_OWNER
        ),
    }


def serialize_family(
    db: Session,
    family: models.Family,
    current_user_id: int | None = None,
) -> dict:
    members = (
        db.query(models.FamilyMember)
        .filter(models.FamilyMember.family_id == family.id)
        .order_by(models.FamilyMember.joined_at.asc())
        .all()
    )

    creator = (
        db.query(models.User)
        .filter(models.User.id == family.created_by_user_id)
        .first()
    )

    my_permission = None
    if current_user_id:
        me = next(
            (m for m in members if m.user_id == current_user_id),
            None,
        )
        if me:
            my_permission = me.permission_role

    return {
        "id": family.id,
        "name": family.name,
        "description": family.description,
        "currency": family.currency or "RUB",
        "initial_balance": family.initial_balance or 0.0,
        "created_at": family.created_at,
        "created_by_user_id": family.created_by_user_id,
        "created_by_name": (
            serialize_user(creator)["name"]
            if creator
            else None
        ),
        "my_permission_role": my_permission,
        "members": [
            serialize_member(db, member)
            for member in members
        ],
    }


def build_invite_url(token: str) -> str:
    return f"{FRONTEND_URL}/family/join/{token}"


def count_family_owners(
    db: Session,
    family_id: int,
) -> int:
    return (
        db.query(models.FamilyMember)
        .filter(
            models.FamilyMember.family_id == family_id,
            models.FamilyMember.permission_role == PERMISSION_OWNER,
        )
        .count()
    )


def cleanup_and_delete_family(
    db: Session,
    family: models.Family,
) -> None:
    family_id = family.id

    db.query(models.Transaction).filter(
        models.Transaction.family_id == family_id,
    ).update(
        {models.Transaction.family_id: None},
        synchronize_session=False,
    )

    db.query(models.FinancialGoal).filter(
        models.FinancialGoal.family_id == family_id,
    ).update(
        {models.FinancialGoal.family_id: None},
        synchronize_session=False,
    )

    db.query(FamilyInvite).filter(
        FamilyInvite.family_id == family_id,
    ).delete(synchronize_session=False)

    db.delete(family)


def serialize_transaction(
    db: Session,
    transaction: models.Transaction,
) -> dict:
    family_id = transaction.family_id

    return {
        "id": transaction.id,
        "amount": transaction.amount,
        "type": transaction.type,
        "category_id": transaction.category_id,
        "category": transaction.category,
        "description": transaction.description,
        "source": transaction.source,
        "transaction_date": transaction.transaction_date,
        "created_at": transaction.created_at,
        "bank_category": transaction.bank_category,
        "ai_confidence": transaction.ai_confidence,
        "ai_source": transaction.ai_source,
        "needs_review": transaction.needs_review,
        "family_id": family_id,
        "created_by": serialize_user_brief(
            db,
            transaction.created_by_user_id or transaction.user_id,
            family_id,
        ),
        "payer": serialize_user_brief(
            db,
            transaction.payer_user_id,
            family_id,
        ),
        "receiver": serialize_user_brief(
            db,
            transaction.receiver_user_id,
            family_id,
        ),
    }


def serialize_goal(
    db: Session,
    goal: models.FinancialGoal,
    membership: models.FamilyMember | None,
    current_user_id: int,
) -> dict:
    creator_id = goal.created_by_user_id or goal.user_id
    creator = (
        db.query(models.User)
        .filter(models.User.id == creator_id)
        .first()
    )

    creator_member = None
    if goal.family_id and creator:
        creator_member = (
            db.query(models.FamilyMember)
            .filter(
                models.FamilyMember.family_id == goal.family_id,
                models.FamilyMember.user_id == creator_id,
            )
            .first()
        )

    creator_profile = (
        serialize_user(creator) if creator else {}
    )

    return {
        "id": goal.id,
        "title": goal.title,
        "target_amount": goal.target_amount,
        "current_amount": goal.current_amount,
        "deadline": goal.deadline,
        "is_completed": goal.is_completed,
        "created_at": goal.created_at,
        "family_id": goal.family_id,
        "created_by": {
            "user_id": creator_id,
            "name": creator_profile.get("name"),
            "avatar_url": creator_profile.get("avatar_url"),
            "family_role": (
                creator_member.family_role
                if creator_member
                else None
            ),
        },
        "is_mine": creator_id == current_user_id,
    }


def can_access_goal(
    goal: models.FinancialGoal,
    user_id: int,
    membership: models.FamilyMember | None,
) -> bool:
    if goal.user_id == user_id:
        return True

    if (
        membership
        and goal.family_id == membership.family_id
    ):
        return True

    return False


def validate_family_participant(
    db: Session,
    family_id: int,
    user_id: int,
) -> None:
    member_ids = get_family_member_user_ids(db, family_id)

    if user_id not in member_ids:
        raise HTTPException(
            status_code=400,
            detail="User is not a member of this budget",
        )
