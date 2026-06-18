import logging

from ai.config import DATASET_PATH
from ai.categorization.utils.normalize import normalize_text
from ai.categorization.utils.merchant_parser import detect_merchant
from ai.categorization.rules_engine import run_rules
from ai.categorization.ml.model import get_categorizer

logger = logging.getLogger(__name__)


def categorize_transaction(text: str, use_ml: bool = True) -> dict:
    if not text or not str(text).strip():
        return {
            "category": "Прочие расходы",
            "confidence": 0.20,
            "source": "fallback",
        }

    normalized = normalize_text(str(text))

    merchant_result = detect_merchant(normalized)
    if merchant_result:
        return merchant_result

    rule_result = run_rules(normalized)
    if rule_result:
        return rule_result

    if not use_ml:
        return {
            "category": "Прочие расходы",
            "confidence": 0.20,
            "source": "fallback",
        }

    try:
        categorizer = get_categorizer()
        ml_result = categorizer.predict(normalized)
        if ml_result:
            return ml_result
    except Exception as exc:
        logger.warning(
            "ML categorization unavailable: %s",
            exc,
        )

    return {
        "category": "Прочие расходы",
        "confidence": 0.20,
        "source": "fallback",
    }


def load_dataset() -> list:
    import json

    if not DATASET_PATH.exists():
        return []

    return json.loads(
        DATASET_PATH.read_text(encoding="utf-8")
    )
