import re

STOP_WORDS = [
    "операция",
    "карте",
    "sbp",
    "сбп",
    "visa",
    "mir",
    "mastercard",
]

def normalize_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"\*{2,}\d+", "", text)
    text = re.sub(r"\d{2}\.\d{2}\.\d{4}", "", text)
    text = re.sub(r"\d+", " ", text)
    text = re.sub(r"[^а-яa-z\s]", " ", text)

    for word in STOP_WORDS:
        text = text.replace(word, "")

    text = re.sub(r"\s+", " ", text)

    return text.strip()
