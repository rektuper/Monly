from rapidfuzz import process

from ai.categorization.known_merchants import (
    MERCHANT_FUZZY_MAP,
    match_supermarket,
)


def detect_merchant(text: str):
    supermarket = match_supermarket(text)
    if supermarket:
        return {
            "merchant": supermarket["merchant"],
            "category": supermarket["category"],
            "confidence": supermarket["confidence"],
            "source": supermarket["source"],
        }

    match = process.extractOne(
        text,
        MERCHANT_FUZZY_MAP.keys(),
        score_cutoff=80,
    )

    if not match:
        return None

    merchant = match[0]

    return {
        "merchant": merchant,
        "category": MERCHANT_FUZZY_MAP[merchant],
        "confidence": 0.95,
        "source": "merchant",
    }
