SUPERMARKET_CATEGORY = "Супермаркеты"

SUPERMARKET_KEYWORDS = (
    "magnit",
    "магнит",
    "pyaterochka",
    "paterochka",
    "pjatjorochka",
    "пятерочка",
    "пятёрочка",
    "5ka",
    "perekrestok",
    "perecrestok",
    "перекресток",
    "prosputnik",
    "prospekt",
    "проспект",
    "lenta",
    "лента",
    "ashan",
    "ашан",
    "auchan",
    "dixy",
    "дикси",
    "spar",
    "metro cash",
    "metro cc",
    "мтро кэш",
    "верный",
    "globus",
    "глобус",
    "okey",
    "окей",
    "monetka",
    "монетка",
    "krasnoe",
    "красное",
    "beloe",
    "белое",
)

MERCHANT_FUZZY_MAP = {
    "магнит": SUPERMARKET_CATEGORY,
    "magnit": SUPERMARKET_CATEGORY,
    "пятерочка": SUPERMARKET_CATEGORY,
    "pyaterochka": SUPERMARKET_CATEGORY,
    "перекресток": SUPERMARKET_CATEGORY,
    "perekrestok": SUPERMARKET_CATEGORY,
    "prosputnik": SUPERMARKET_CATEGORY,
    "лента": SUPERMARKET_CATEGORY,
    "lenta": SUPERMARKET_CATEGORY,
    "ашан": SUPERMARKET_CATEGORY,
    "ashan": SUPERMARKET_CATEGORY,
    "дикси": SUPERMARKET_CATEGORY,
    "dixy": SUPERMARKET_CATEGORY,
    "яндекс go": "Транспорт",
    "яндекс": "Транспорт",
    "uber": "Транспорт",
    "ситимобил": "Транспорт",
    "spotify": "Подписки",
    "netflix": "Подписки",
    "steam": "Игры",
    "ozon": "Маркетплейсы",
    "wildberries": "Маркетплейсы",
    "мегамаркет": "Маркетплейсы",
    "аптека": "Аптеки",
    "ригла": "Аптеки",
    "mcdonalds": "Кафе и рестораны",
    "kfc": "Кафе и рестораны",
    "burger king": "Кафе и рестораны",
    "starbucks": "Кафе и рестораны",
}


def match_supermarket(normalized_text: str) -> dict | None:
    if not normalized_text:
        return None

    for keyword in SUPERMARKET_KEYWORDS:
        if keyword in normalized_text:
            return {
                "category": SUPERMARKET_CATEGORY,
                "confidence": 0.98,
                "source": "rules",
                "merchant": keyword,
            }

    return None
