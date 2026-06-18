import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas

from core.dependencies import get_admin_user, get_db
from ai.config import (
    DATASET_PATH,
    FEEDBACK_PATH,
    CONFIDENCE_THRESHOLD,
    AUTO_RETRAIN_FEEDBACK_BATCH,
)
from ai.categorization.categorize import load_dataset
from ai.learning.retrain import retrain_model
from ai.learning.merge_feedback import merge_feedback_into_dataset
from utils.categories import (
    apply_ai_categorization,
    fix_user_income_transactions,
)
from services.rules_recategorize import (
    recategorize_user_by_known_rules,
)

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


def _read_feedback() -> list:
    if not FEEDBACK_PATH.exists():
        return []

    return json.loads(
        FEEDBACK_PATH.read_text(encoding="utf-8")
    )


@router.get(
    "/dashboard",
    response_model=schemas.AdminDashboardStats,
)
def admin_dashboard(
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(get_admin_user),
):
    users_count = db.query(models.User).count()

    transactions_count = (
        db.query(models.Transaction)
        .filter(models.Transaction.is_deleted == False)
        .count()
    )

    pending_review_count = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.is_deleted == False,
            models.Transaction.needs_review == True,
        )
        .count()
    )

    feedback = _read_feedback()

    return {
        "users_count": users_count,
        "transactions_count": transactions_count,
        "pending_review_count": pending_review_count,
        "feedback_pending_count": len(feedback),
        "dataset_size": len(load_dataset()),
    }


@router.get(
    "/ai/status",
    response_model=schemas.AdminAiStatus,
)
def admin_ai_status(
    admin_user: models.User = Depends(get_admin_user),
):
    feedback = _read_feedback()

    return {
        "dataset_size": len(load_dataset()),
        "feedback_count": len(feedback),
        "confidence_threshold": CONFIDENCE_THRESHOLD,
        "auto_retrain_batch": AUTO_RETRAIN_FEEDBACK_BATCH,
        "modules": [
            "merchant_parser",
            "rules_engine",
            "embedding_classifier",
            "feedback_learning",
            "recommendations",
            "forecasting",
        ],
    }


@router.get(
    "/ai/feedback",
    response_model=list[schemas.AdminFeedbackItem],
)
def admin_list_feedback(
    limit: int = 50,
    admin_user: models.User = Depends(get_admin_user),
):
    feedback = _read_feedback()
    return feedback[-limit:][::-1]


@router.post("/ai/merge-feedback")
def admin_merge_feedback(
    admin_user: models.User = Depends(get_admin_user),
):
    return merge_feedback_into_dataset()


@router.post("/ai/retrain")
def admin_retrain(
    admin_user: models.User = Depends(get_admin_user),
):
    merge_result = merge_feedback_into_dataset()
    retrain_result = retrain_model()

    return {
        "status": "ok",
        "merge": merge_result,
        "retrain": retrain_result,
    }


@router.post("/ai/recategorize-pending")
def admin_recategorize_pending(
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(get_admin_user),
):
    pending = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.is_deleted == False,
            models.Transaction.needs_review == True,
        )
        .all()
    )

    updated = 0

    for transaction in pending:
        owner = (
            db.query(models.User)
            .filter(models.User.id == transaction.user_id)
            .first()
        )

        if not owner:
            continue

        category, ai = apply_ai_categorization(
            db,
            owner,
            transaction.description,
            transaction.bank_category,
            transaction.type,
        )

        transaction.category_id = category.id
        transaction.ai_confidence = ai.get("confidence")
        transaction.ai_source = ai.get("source")
        transaction.needs_review = (
            ai.get("confidence", 0) < CONFIDENCE_THRESHOLD
        )

        updated += 1

    db.commit()

    return {
        "processed": len(pending),
        "updated": updated,
    }


@router.post("/transactions/fix-income-categories")
def admin_fix_income_categories(
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(get_admin_user),
):
    users = db.query(models.User).all()
    total_income = 0
    updated = 0

    for user in users:
        income_count, changed = fix_user_income_transactions(
            db,
            user,
        )
        total_income += income_count
        updated += changed

    db.commit()

    return {
        "users_processed": len(users),
        "income_transactions": total_income,
        "updated": updated,
    }


@router.post("/transactions/apply-known-rules")
def admin_apply_known_rules(
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(get_admin_user),
):
    users = db.query(models.User).all()
    totals = {
        "users_processed": len(users),
        "income_updated": 0,
        "expense_updated": 0,
        "total_updated": 0,
    }

    for user in users:
        result = recategorize_user_by_known_rules(
            db,
            user,
        )
        totals["income_updated"] += result["income_updated"]
        totals["expense_updated"] += result["expense_updated"]
        totals["total_updated"] += result["total_updated"]

    db.commit()
    return totals


@router.get(
    "/users",
    response_model=list[schemas.AdminUserItem],
)
def admin_list_users(
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(get_admin_user),
):
    users = (
        db.query(models.User)
        .order_by(models.User.id.asc())
        .all()
    )

    result = []

    for user in users:
        tx_count = (
            db.query(models.Transaction)
            .filter(
                models.Transaction.user_id == user.id,
                models.Transaction.is_deleted == False,
            )
            .count()
        )

        result.append({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "transactions_count": tx_count,
        })

    return result


@router.patch(
    "/users/{user_id}/role",
    response_model=schemas.UserResponse,
)
def admin_update_user_role(
    user_id: int,
    payload: schemas.AdminUserRoleUpdate,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(get_admin_user),
):
    if payload.role not in ("user", "admin"):
        raise HTTPException(
            status_code=400,
            detail="Role must be 'user' or 'admin'",
        )

    user = (
        db.query(models.User)
        .filter(models.User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin_user.id and payload.role != "admin":
        raise HTTPException(
            status_code=400,
            detail="Cannot remove your own admin role",
        )

    user.role = payload.role
    db.commit()
    db.refresh(user)

    return user
