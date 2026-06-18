import json

from ai.config import DATASET_PATH, FEEDBACK_PATH


def merge_feedback_into_dataset() -> dict:
    if not FEEDBACK_PATH.exists():
        return {"added": 0, "total": _dataset_size()}

    feedback = json.loads(
        FEEDBACK_PATH.read_text(encoding="utf-8")
    )

    dataset = []
    if DATASET_PATH.exists():
        dataset = json.loads(
            DATASET_PATH.read_text(encoding="utf-8")
        )

    existing_texts = {
        item["text"].strip().lower()
        for item in dataset
    }

    added = 0

    for item in feedback:
        text = (item.get("text") or "").strip()
        correct = item.get("correct_category") or item.get("correct")

        if not text or not correct:
            continue

        key = text.lower()
        if key in existing_texts:
            for row in dataset:
                if row["text"].strip().lower() == key:
                    row["category"] = correct
            continue

        dataset.append({
            "text": text,
            "category": correct,
        })
        existing_texts.add(key)
        added += 1

    DATASET_PATH.write_text(
        json.dumps(dataset, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    return {"added": added, "total": len(dataset)}


def _dataset_size() -> int:
    if not DATASET_PATH.exists():
        return 0

    return len(
        json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    )
