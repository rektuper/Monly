from rapidfuzz import fuzz

from ai.categorization.utils.normalize import normalize_text
from ai.categorization.utils.merchant_parser import detect_merchant

import models

SIMILARITY_THRESHOLD = 82


def _normalized_pair(a: str, b: str) -> tuple[str, str]:
    return (
        normalize_text(a or ""),
        normalize_text(b or ""),
    )


def descriptions_are_similar(
    description_a: str,
    description_b: str,
) -> bool:
    left, right = _normalized_pair(
        description_a,
        description_b,
    )

    if not left or not right:
        return False

    if left == right:
        return True

    return (
        fuzz.token_set_ratio(left, right)
        >= SIMILARITY_THRESHOLD
    )


def _same_merchant(
    description_a: str,
    description_b: str,
) -> bool:
    left, right = _normalized_pair(
        description_a,
        description_b,
    )

    if not left or not right:
        return False

    merchant_a = detect_merchant(left)
    merchant_b = detect_merchant(right)

    if not merchant_a or not merchant_b:
        return False

    return (
        merchant_a.get("merchant")
        == merchant_b.get("merchant")
    )


def transactions_are_similar(
    source: models.Transaction,
    candidate: models.Transaction,
) -> bool:
    if source.type != candidate.type:
        return False

    source_desc = source.description or ""
    candidate_desc = candidate.description or ""

    if descriptions_are_similar(
        source_desc,
        candidate_desc,
    ):
        return True

    return _same_merchant(
        source_desc,
        candidate_desc,
    )


def apply_category_to_similar(
    db,
    user_id: int,
    source: models.Transaction,
    category_id: int,
    *,
    only_pending_review: bool = False,
) -> int:
    if not source.description:
        return 0

    query = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.user_id == user_id,
            models.Transaction.is_deleted == False,
            models.Transaction.id != source.id,
            models.Transaction.type == source.type,
        )
    )

    if only_pending_review:
        query = query.filter(
            models.Transaction.needs_review == True,
        )

    candidates = query.all()

    updated = 0

    for candidate in candidates:
        if not transactions_are_similar(
            source,
            candidate,
        ):
            continue

        candidate.category_id = category_id
        candidate.needs_review = False
        updated += 1

    return updated
