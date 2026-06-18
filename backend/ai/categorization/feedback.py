import json
from datetime import datetime, timezone

from ai.config import (
    FEEDBACK_PATH,
    AUTO_RETRAIN_FEEDBACK_BATCH,
)
from ai.learning.retrain import retrain_model


def save_feedback(
    text: str,
    predicted_category: str,
    correct_category: str,
    source: str = "user",
):
    if not text or not correct_category:
        return {"saved": False}

    if FEEDBACK_PATH.exists():
        data = json.loads(
            FEEDBACK_PATH.read_text(encoding="utf-8")
        )
    else:
        data = []

    data.append({
        "text": text,
        "predicted_category": predicted_category,
        "correct_category": correct_category,
        "source": source,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    FEEDBACK_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    retrain_result = None
    if len(data) % AUTO_RETRAIN_FEEDBACK_BATCH == 0:
        retrain_result = retrain_model()

    return {
        "saved": True,
        "feedback_count": len(data),
        "retrain": retrain_result,
    }
