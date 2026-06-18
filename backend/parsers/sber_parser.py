import re
import pdfplumber

from datetime import datetime


def parse_sber_pdf(file):

    transactions = []

    with pdfplumber.open(file) as pdf:

        full_text = ""

        for page in pdf.pages:

            text = page.extract_text()

            if text:

                full_text += text + "\n"

    lines = full_text.split("\n")

    i = 0

    while i < len(lines):

        line = lines[i]

        pattern = (
            r"(\d{2}\.\d{2}\.\d{4})\s"
            r"(\d{2}:\d{2})\s"
            r"(.+?)\s"
            r"([+]?\d[\d\s]*,\d{2})\s"
            r"([-\d\s]*,\d{2})"
        )

        match = re.search(
            pattern,
            line
        )

        if match:

            date = match.group(1)

            time = match.group(2)

            category = match.group(3)

            amount_raw = (
                match.group(4)
            )

            amount_clean = (
                amount_raw
                .replace("+", "")
                .replace(" ", "")
                .replace(",", ".")
            )

            amount = float(
                amount_clean
            )

            transaction_type = (
                "income"
                if "+"
                in amount_raw

                else "expense"
            )

            description = ""

            if i + 1 < len(lines):

                description = (
                    lines[i + 1]
                )

            transaction_date = (
                datetime.strptime(
                    f"{date} {time}",
                    "%d.%m.%Y %H:%M"
                )
            )

            transactions.append({
                "amount": amount,

                "type":
                    transaction_type,

                "category":
                    category,

                "description":
                    description,

                "transaction_date":
                    transaction_date,
            })

        i += 1

    return transactions