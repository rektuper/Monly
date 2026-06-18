from ai.categorization.known_merchants import match_supermarket

RULES = {
    "яндекс": "Транспорт",
    "uber": "Транспорт",
    "такси": "Транспорт",
    "spotify": "Подписки",
    "netflix": "Подписки",
    "подписк": "Подписки",
    "steam": "Игры",
    "playstation": "Игры",
    "ozon": "Маркетплейсы",
    "wildberries": "Маркетплейсы",
    "wb ": "Маркетплейсы",
    "аптек": "Аптеки",
    "ригла": "Аптеки",
    "mcdonald": "Кафе и рестораны",
    "kfc": "Кафе и рестораны",
    "starbucks": "Кафе и рестораны",
    "ресторан": "Кафе и рестораны",
    "кафе": "Кафе и рестораны",
    "перевод": "Переводы",
    "sbp": "Переводы",
    "сбп": "Переводы",
    "кино": "Развлечения",
    "cinema": "Развлечения",
}


def run_rules(text: str):
    supermarket = match_supermarket(text)
    if supermarket:
        return supermarket

    for keyword, category in RULES.items():
        if keyword in text:
            return {
                "category": category,
                "confidence": 0.92,
                "source": "rules",
            }

    return None
