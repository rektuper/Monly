import models
from services.categorization_service import (
    INCOME_DEFAULT_CATEGORY,
    categorize_for_transaction,
    income_categorization_result,
)


def get_or_create_category(
    db,
    current_user,
    category_name,
    transaction_type,
):
    category = (
        db.query(models.UserCategory)
        .filter(
            models.UserCategory.user_id == current_user.id,
            models.UserCategory.name == category_name,
        )
        .first()
    )

    if not category:
        category = models.UserCategory(
            user_id=current_user.id,
            name=category_name,
            type=transaction_type,
        )
        db.add(category)
        db.commit()
        db.refresh(category)

    return category


def apply_ai_categorization(
    db,
    current_user,
    description,
    bank_category,
    transaction_type,
    use_ml: bool = True,
):
    if transaction_type == "income":
        ai = income_categorization_result(bank_category)
        category = get_or_create_category(
            db,
            current_user,
            INCOME_DEFAULT_CATEGORY,
            "income",
        )
        return category, ai

    ai = categorize_for_transaction(
        description,
        bank_category,
        transaction_type,
        use_ml=use_ml,
    )

    category = get_or_create_category(
        db,
        current_user,
        ai["category"],
        transaction_type,
    )

    return category, ai


def fix_user_income_transactions(
    db,
    user,
) -> tuple[int, int]:
    category = get_or_create_category(
        db,
        user,
        INCOME_DEFAULT_CATEGORY,
        "income",
    )

    income_transactions = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.user_id == user.id,
            models.Transaction.type == "income",
            models.Transaction.is_deleted == False,
        )
        .all()
    )

    updated = 0

    for transaction in income_transactions:
        needs_update = (
            transaction.category_id != category.id
            or transaction.needs_review
            or transaction.ai_source != "income_default"
        )

        if not needs_update:
            continue

        transaction.category_id = category.id
        transaction.ai_confidence = 1.0
        transaction.ai_source = "income_default"
        transaction.needs_review = False
        updated += 1

    return len(income_transactions), updated
