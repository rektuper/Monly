import hashlib


def generate_fingerprint(

    amount,
    description,
    transaction_date,
    transaction_type,
):

    raw = (

        f"{amount}|"

        f"{description}|"

        f"{transaction_date}|"

        f"{transaction_type}"
    )

    return hashlib.sha256(
        raw.encode()
    ).hexdigest()