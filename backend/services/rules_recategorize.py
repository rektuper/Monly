from ai.config import CONFIDENCE_THRESHOLD
from services.categorization_service import categorize_for_transaction
from utils.categories import (
    get_or_create_category,
    fix_user_income_transactions,
)

import models

RULE_SOURCES = frozenset({"rules", "merchant"})


def _apply_rules_to_expense(
    db,
    user: models.User,
    transaction: models.Transaction,
) -> bool:
    ai = categorize_for_transaction(
        transaction.description,
        transaction.bank_category,
        transaction.type,
    )

    if ai.get("source") not in RULE_SOURCES:
        return False

    category = get_or_create_category(
        db,
        user,
        ai["category"],
        transaction.type,
    )

    if category.id == transaction.category_id:
        return False

    transaction.category_id = category.id
    transaction.ai_confidence = ai.get("confidence")
    transaction.ai_source = ai.get("source")
    transaction.needs_review = (
        float(ai.get("confidence", 0))
        < CONFIDENCE_THRESHOLD
    )

    return True


def recategorize_user_by_known_rules(
    db,
    user: models.User,
) -> dict:
    income_total, income_updated = fix_user_income_transactions(
        db,
        user,
    )

    expenses = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.user_id == user.id,
            models.Transaction.is_deleted == False,
            models.Transaction.type == "expense",
        )
        .all()
    )

    expense_checked = len(expenses)
    expense_updated = 0

    for transaction in expenses:
        if _apply_rules_to_expense(db, user, transaction):
            expense_updated += 1

    return {
        "income_transactions": income_total,
        "income_updated": income_updated,
        "expense_checked": expense_checked,
        "expense_updated": expense_updated,
        "total_updated": income_updated + expense_updated,
    }
