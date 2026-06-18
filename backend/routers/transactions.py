from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)

from sqlalchemy.orm import Session

from database import SessionLocal

from core.dependencies import (
    get_current_user
)

from utils.fingerprint import (
    generate_fingerprint
)

from services.categorization_service import (
    categorize_for_transaction,
)

from services.transaction_similarity import (
    apply_category_to_similar,
)

from utils.categories import fix_user_income_transactions
from services.rules_recategorize import (
    recategorize_user_by_known_rules,
)
from services.family_service import (
    get_family_member_user_ids,
    get_membership,
    can_write_transactions,
    can_modify_transaction,
    serialize_transaction,
    validate_family_participant,
)

import models
import schemas

from ai.categorization.feedback import (
    save_feedback
)


router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"]
)


def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


@router.post(
    "",
    response_model=
    schemas.TransactionResponse
)
def create_transaction(

    transaction:
    schemas.TransactionCreate,

    db: Session = Depends(get_db),

    current_user:
    models.User = Depends(
        get_current_user
    )
):

    category = (

        db.query(
            models.UserCategory
        )

        .filter(
            models.UserCategory.id
            == transaction.category_id,

            models.UserCategory.user_id
            == current_user.id
        )

        .first()
    )

    if not category:

        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    membership = get_membership(db, current_user.id)

    if membership and not can_write_transactions(membership):
        raise HTTPException(
            status_code=403,
            detail="Observers cannot add transactions",
        )

    payer_id = transaction.payer_user_id or current_user.id
    receiver_id = transaction.receiver_user_id or current_user.id

    if membership:
        validate_family_participant(
            db,
            membership.family_id,
            payer_id,
        )
        validate_family_participant(
            db,
            membership.family_id,
            receiver_id,
        )

    fingerprint = (
        generate_fingerprint(

            amount=
                transaction.amount,

            description=
                transaction.description,

            transaction_date=
                transaction.transaction_date,

            transaction_type=
                transaction.type,
        )
    )

    existing_transaction = (

        db.query(
            models.Transaction
        )

        .filter(
            models.Transaction.fingerprint
            == fingerprint
        )

        .first()
    )

    if existing_transaction:

        raise HTTPException(
            status_code=400,
            detail="Duplicate transaction"
        )

    membership = get_membership(db, current_user.id)

    ai = categorize_for_transaction(
        transaction.description,
        transaction_type=transaction.type,
    )

    new_transaction = (
        models.Transaction(

            user_id=current_user.id,

            created_by_user_id=current_user.id,

            payer_user_id=(
                payer_id if transaction.type == "expense" else None
            ),

            receiver_user_id=(
                receiver_id if transaction.type == "income" else None
            ),

            family_id=membership.family_id if membership else None,

            amount=transaction.amount,

            type=transaction.type,

            category_id=
                transaction.category_id,

            description=
                transaction.description,

            transaction_date=
                transaction.transaction_date,

            source="manual",

            fingerprint=
                fingerprint,

            ai_confidence=ai["confidence"],

            ai_source=ai["source"],

            needs_review=False,
        )
    )

    db.add(new_transaction)

    db.commit()

    db.refresh(new_transaction)

    return serialize_transaction(db, new_transaction)


@router.post("/fix-income-categories")
def fix_my_income_categories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    total, updated = fix_user_income_transactions(
        db,
        current_user,
    )
    db.commit()

    return {
        "income_transactions": total,
        "updated": updated,
    }


@router.post("/apply-known-rules")
def apply_known_rules_to_my_transactions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    result = recategorize_user_by_known_rules(
        db,
        current_user,
    )
    db.commit()
    return result


@router.get(
    "",
    response_model=list[
        schemas.TransactionResponse
    ]
)
def get_transactions(

    needs_review: bool | None = Query(None),

    db: Session = Depends(get_db),

    current_user:
    models.User = Depends(
        get_current_user
    )
):

    membership = get_membership(db, current_user.id)

    query = db.query(models.Transaction).filter(
        models.Transaction.is_deleted == False,
    )

    if membership:
        member_ids = get_family_member_user_ids(
            db,
            membership.family_id,
        )
        query = query.filter(
            models.Transaction.user_id.in_(member_ids),
        )
    else:
        query = query.filter(
            models.Transaction.user_id == current_user.id,
        )

    if needs_review is not None:
        query = query.filter(
            models.Transaction.needs_review == needs_review
        )

    transactions = (
        query
        .order_by(
            models.Transaction.created_at.desc()
        )
        .all()
    )

    return [
        serialize_transaction(db, item)
        for item in transactions
    ]


@router.patch(
    "/{transaction_id}",
    response_model=
    schemas.TransactionUpdateResult
)
def update_transaction(

    transaction_id: int,

    transaction_data:
    schemas.TransactionUpdate,

    db: Session = Depends(get_db),

    current_user:
    models.User = Depends(
        get_current_user
    )
):

    membership = get_membership(db, current_user.id)

    transaction = (

        db.query(
            models.Transaction
        )

        .filter(
            models.Transaction.id
            == transaction_id,

            models.Transaction.is_deleted
            == False
        )

        .first()
    )

    if not transaction:

        raise HTTPException(
            status_code=404,
            detail="Transaction not found"
        )

    if not can_modify_transaction(
        db,
        membership,
        current_user.id,
        transaction,
    ):
        raise HTTPException(
            status_code=403,
            detail="You cannot edit this transaction",
        )

    old_category = (
        db.query(models.UserCategory)
        .filter(models.UserCategory.id == transaction.category_id)
        .first()
    )

    old_category_name = (
        old_category.name if old_category else ""
    )

    had_needs_review = transaction.needs_review

    if (
        transaction_data.category_id
        is not None
    ):

        category = (

            db.query(
                models.UserCategory
            )

            .filter(
                models.UserCategory.id
                ==
                transaction_data.category_id,

                models.UserCategory.user_id
                == current_user.id
            )

            .first()
        )

        if not category:

            raise HTTPException(
                status_code=404,
                detail="Category not found"
            )

        transaction.category_id = (
            transaction_data.category_id
        )

        transaction.needs_review = False

    if (
        transaction_data.description
        is not None
    ):

        transaction.description = (
            transaction_data.description
        )

    if (
        transaction_data.amount
        is not None
    ):

        transaction.amount = (
            transaction_data.amount
        )

    if (
        transaction_data.type
        is not None
    ):

        transaction.type = (
            transaction_data.type
        )

    if membership and transaction_data.payer_user_id is not None:
        validate_family_participant(
            db,
            membership.family_id,
            transaction_data.payer_user_id,
        )
        transaction.payer_user_id = transaction_data.payer_user_id

    if membership and transaction_data.receiver_user_id is not None:
        validate_family_participant(
            db,
            membership.family_id,
            transaction_data.receiver_user_id,
        )
        transaction.receiver_user_id = transaction_data.receiver_user_id

    category_changed = (
        transaction_data.category_id is not None
        and old_category
        and old_category.id != transaction.category_id
    )

    similar_updated_count = 0

    if (
        transaction_data.category_id is not None
        and transaction.description
    ):
        if category_changed:
            similar_updated_count = (
                apply_category_to_similar(
                    db,
                    current_user.id,
                    transaction,
                    transaction.category_id,
                    only_pending_review=False,
                )
            )
        elif had_needs_review:
            similar_updated_count = (
                apply_category_to_similar(
                    db,
                    current_user.id,
                    transaction,
                    transaction.category_id,
                    only_pending_review=True,
                )
            )

    db.commit()

    db.refresh(transaction)

    if category_changed:

        new_category = (
            db.query(models.UserCategory)
            .filter(models.UserCategory.id == transaction.category_id)
            .first()
        )

        if new_category and transaction.description:
            try:
                save_feedback(
                    text=transaction.description,
                    predicted_category=old_category_name,
                    correct_category=new_category.name,
                    source=transaction.ai_source or "unknown",
                )
            except Exception:
                pass

    return {
        "transaction": serialize_transaction(db, transaction),
        "similar_updated_count": similar_updated_count,
    }


@router.delete(
    "/{transaction_id}"
)
def delete_transaction(

    transaction_id: int,

    db: Session = Depends(get_db),

    current_user:
    models.User = Depends(
        get_current_user
    )
):

    membership = get_membership(db, current_user.id)

    transaction = (

        db.query(
            models.Transaction
        )

        .filter(
            models.Transaction.id
            == transaction_id,

            models.Transaction.is_deleted
            == False
        )

        .first()
    )

    if not transaction:

        raise HTTPException(
            status_code=404,
            detail="Transaction not found"
        )

    if not can_modify_transaction(
        db,
        membership,
        current_user.id,
        transaction,
    ):
        raise HTTPException(
            status_code=403,
            detail="You cannot delete this transaction",
        )

    transaction.is_deleted = True

    db.commit()

    return {
        "message":
            "Transaction deleted"
    }
