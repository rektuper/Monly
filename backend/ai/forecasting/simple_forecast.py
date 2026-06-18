import models
from ai.forecasting.smart_forecast import calculate_smart_forecast


def calculate_forecast(db, user_id: int) -> dict:
    transactions = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.user_id == user_id,
            models.Transaction.is_deleted == False,
        )
        .order_by(models.Transaction.transaction_date.asc())
        .all()
    )

    return calculate_smart_forecast(transactions)
