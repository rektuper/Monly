import logging

from ai.config import CONFIDENCE_THRESHOLD, ENABLE_ML_CATEGORIZATION
from ai.categorization.bank_categories import map_bank_category
from ai.categorization.categorize import categorize_transaction

logger = logging.getLogger(__name__)

INCOME_DEFAULT_CATEGORY = "Пополнение"


def income_categorization_result(
    bank_category: str | None = None,
) -> dict:
    return {
        "category": INCOME_DEFAULT_CATEGORY,
        "confidence": 1.0,
        "source": "income_default",
        "needs_review": False,
        "bank_category": bank_category or None,
    }


def build_categorization_input(
    description: str | None,
    bank_category: str | None = None,
) -> str:
    description = (description or "").strip()
    bank_category = (bank_category or "").strip()

    if description:
        return description

    return bank_category


def categorize_for_transaction(
    description: str | None,
    bank_category: str | None = None,
    transaction_type: str | None = None,
    use_ml: bool = True,
) -> dict:
    if transaction_type == "income":
        return income_categorization_result(bank_category)

    bank_result = map_bank_category(bank_category)
    if bank_result:
        return {
            **bank_result,
            "needs_review": False,
            "bank_category": bank_category or None,
        }

    text = build_categorization_input(
        description,
        bank_category,
    )

    result = categorize_transaction(
        text,
        use_ml=use_ml and ENABLE_ML_CATEGORIZATION,
    )
    confidence = float(result.get("confidence", 0))
    needs_review = confidence < CONFIDENCE_THRESHOLD

    return {
        "category": result.get("category", "Прочие расходы"),
        "confidence": confidence,
        "source": result.get("source", "fallback"),
        "needs_review": needs_review,
        "bank_category": bank_category or None,
    }
