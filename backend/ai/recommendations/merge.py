from collections import defaultdict


TYPE_LIMITS = {
    "goal_risk": 1,
    "goal_boost": 1,
    "save_opportunity": 1,
    "create_goal": 1,
    "trend_up": 2,
    "concentration": 1,
    "forecast": 1,
}

PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}


def merge_recommendation_lists(
    *lists: list[dict],
    limit: int = 10,
) -> list[dict]:
    merged: list[dict] = []
    seen_ids: set[str] = set()
    type_counts: dict[str, int] = defaultdict(int)

    for items in lists:
        for item in items:
            item_id = item.get("id")
            if not item_id or item_id in seen_ids:
                continue

            item_type = item.get("type", "info")
            max_for_type = TYPE_LIMITS.get(item_type, 2)

            if type_counts[item_type] >= max_for_type:
                continue

            if _is_duplicate_surplus(item, merged):
                continue

            seen_ids.add(item_id)
            type_counts[item_type] += 1
            merged.append(item)

    merged.sort(
        key=lambda row: PRIORITY_ORDER.get(row.get("priority"), 3)
    )
    return merged[:limit]


def _is_duplicate_surplus(item: dict, existing: list[dict]) -> bool:
    item_type = item.get("type")
    if item_type not in {"save_opportunity", "create_goal"}:
        return False

    for row in existing:
        if row.get("type") == item_type:
            return True

    if item_type == "save_opportunity":
        for row in existing:
            if row.get("type") == "create_goal" and item.get("id") == "surplus_streak":
                return False
            if row.get("id", "").endswith("surplus_streak"):
                return True
            if row.get("id") == "surplus_streak":
                return True

    return False
