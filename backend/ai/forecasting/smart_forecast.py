from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Iterable

WINDOWS = (
    (7, 0.45),
    (30, 0.35),
    (90, 0.20),
)

TREND_STABLE_THRESHOLD = 0.08
RECURRING_AMOUNT_TOLERANCE = 0.12
RECURRING_MIN_AMOUNT = 500
RECURRING_MIN_OCCURRENCES = 2


def _normalize_dt(value: datetime) -> datetime:
    if value.tzinfo is not None:
        return value.replace(tzinfo=None)
    return value


def _month_end(now: datetime) -> datetime:
    if now.month == 12:
        return datetime(now.year + 1, 1, 1) - timedelta(seconds=1)
    return datetime(now.year, now.month + 1, 1) - timedelta(seconds=1)


def _daily_flow(
    transactions: Iterable,
    since: datetime | None = None,
    until: datetime | None = None,
) -> dict:
    daily: dict = defaultdict(
        lambda: {"income": 0.0, "expense": 0.0}
    )

    for transaction in transactions:
        dt = _normalize_dt(transaction.transaction_date)

        if since and dt < since:
            continue
        if until and dt > until:
            continue

        bucket = daily[dt.date()]

        if transaction.type == "income":
            bucket["income"] += float(transaction.amount)
        elif transaction.type == "expense":
            bucket["expense"] += float(transaction.amount)

    return daily


def _window_totals(
    transactions: Iterable,
    days: int,
    now: datetime,
) -> tuple[float, float, int]:
    since = now - timedelta(days=days)
    daily = _daily_flow(transactions, since=since, until=now)

    income = sum(item["income"] for item in daily.values())
    expense = sum(item["expense"] for item in daily.values())

    return income, expense, days


def _weighted_daily_rates(
    transactions: Iterable,
    now: datetime,
) -> tuple[float, float, str]:
    income_parts: list[tuple[float, float]] = []
    expense_parts: list[tuple[float, float]] = []

    for days, weight in WINDOWS:
        income, expense, span = _window_totals(
            transactions,
            days,
            now,
        )

        if income > 0 or expense > 0:
            income_parts.append((income / span, weight))
            expense_parts.append((expense / span, weight))

    if not income_parts and not expense_parts:
        return 0.0, 0.0, "low"

    def blend(parts: list[tuple[float, float]]) -> float:
        if not parts:
            return 0.0
        total_weight = sum(weight for _, weight in parts)
        return sum(value * weight for value, weight in parts) / total_weight

    avg_income = blend(income_parts)
    avg_expense = blend(expense_parts)

    active_days = len(
        _daily_flow(
            transactions,
            since=now - timedelta(days=90),
            until=now,
        )
    )
    tx_count = sum(
        1
        for transaction in transactions
        if _normalize_dt(transaction.transaction_date) >= now - timedelta(days=90)
    )

    if active_days >= 45 and tx_count >= 25:
        confidence = "high"
    elif active_days >= 14 and tx_count >= 8:
        confidence = "medium"
    else:
        confidence = "low"

    return avg_income, avg_expense, confidence


def _period_expense(
    transactions: Iterable,
    start: datetime,
    end: datetime,
) -> float:
    daily = _daily_flow(transactions, since=start, until=end)
    return sum(item["expense"] for item in daily.values())


def _period_income(
    transactions: Iterable,
    start: datetime,
    end: datetime,
) -> float:
    daily = _daily_flow(transactions, since=start, until=end)
    return sum(item["income"] for item in daily.values())


def _compute_trend(
    transactions: Iterable,
    now: datetime,
    metric: str,
) -> tuple[str, float]:
    recent_start = now - timedelta(days=7)
    prev_start = now - timedelta(days=14)
    prev_end = now - timedelta(days=7)

    if metric == "expense":
        recent = _period_expense(transactions, recent_start, now)
        previous = _period_expense(transactions, prev_start, prev_end)
    else:
        recent = _period_income(transactions, recent_start, now)
        previous = _period_income(transactions, prev_start, prev_end)

    if previous <= 0:
        if recent > 0:
            return "up", 100.0
        return "stable", 0.0

    change = ((recent - previous) / previous) * 100

    if change >= TREND_STABLE_THRESHOLD * 100:
        return "up", round(change, 1)
    if change <= -TREND_STABLE_THRESHOLD * 100:
        return "down", round(change, 1)
    return "stable", round(change, 1)


def _detect_recurring_income(
    transactions: Iterable,
    now: datetime,
) -> list[dict]:
    incomes = [
        transaction
        for transaction in transactions
        if transaction.type == "income"
        and float(transaction.amount) >= RECURRING_MIN_AMOUNT
        and _normalize_dt(transaction.transaction_date) >= now - timedelta(days=120)
    ]

    buckets: dict[int, list] = defaultdict(list)

    for transaction in incomes:
        key = round(float(transaction.amount), -2)
        buckets[key].append(transaction)

    recurring: list[dict] = []

    for _, group in buckets.items():
        if len(group) < RECURRING_MIN_OCCURRENCES:
            continue

        group.sort(
            key=lambda item: _normalize_dt(item.transaction_date)
        )

        amounts = [float(item.amount) for item in group]
        avg_amount = sum(amounts) / len(amounts)

        gaps = []
        for index in range(1, len(group)):
            left = _normalize_dt(group[index - 1].transaction_date)
            right = _normalize_dt(group[index].transaction_date)
            gaps.append((right - left).days)

        if not gaps:
            continue

        median_gap = sorted(gaps)[len(gaps) // 2]

        if not (25 <= median_gap <= 35):
            continue

        last_date = _normalize_dt(group[-1].transaction_date)
        typical_day = min(
            max(int(sum(item.transaction_date.day for item in group) / len(group)), 1),
            28,
        )

        next_date = last_date + timedelta(days=median_gap)
        while next_date <= now:
            next_date += timedelta(days=median_gap)

        recurring.append({
            "amount": avg_amount,
            "typical_day": typical_day,
            "next_date": next_date,
            "median_gap_days": median_gap,
        })

    return recurring


def _recurring_income_in_range(
    recurring: list[dict],
    start: datetime,
    end: datetime,
) -> float:
    total = 0.0

    for item in recurring:
        cursor = item["next_date"]

        while cursor <= end:
            if cursor >= start:
                total += item["amount"]
            cursor += timedelta(days=item["median_gap_days"])

    return total


def _format_money(amount: float) -> str:
    return f"{amount:,.0f} ₽".replace(",", " ")


def _top_expense_category(
    transactions: list,
    month_start: datetime,
    now: datetime,
) -> tuple[str, float, float] | None:
    totals: dict[str, float] = defaultdict(float)
    total_expense = 0.0

    for transaction in transactions:
        if transaction.type != "expense":
            continue
        dt = _normalize_dt(transaction.transaction_date)
        if dt < month_start or dt > now:
            continue
        if not transaction.category:
            continue
        amount = float(transaction.amount)
        totals[transaction.category.name] += amount
        total_expense += amount

    if not totals or total_expense <= 0:
        return None

    name, amount = max(totals.items(), key=lambda item: item[1])
    return name, amount, (amount / total_expense) * 100


def _build_deficit_summary(
    *,
    projected_month_end: float,
    avg_daily_income: float,
    avg_daily_expense: float,
    days_left: int,
    transactions: list,
    now: datetime,
) -> str:
    daily_gap = max(avg_daily_expense - avg_daily_income, 0)
    month_start = datetime(now.year, now.month, 1)
    top = _top_expense_category(transactions, month_start, now)

    lead = (
        f"Риск дефицита: к концу месяца ожидается "
        f"{_format_money(projected_month_end)}."
    )

    if daily_gap <= 0:
        return (
            f"{lead} Расходы уже опережают план - "
            f"пересмотрите крупные траты и отложите необязательные покупки."
        )

    if daily_gap <= 100:
        action = (
            f" Достаточно сэкономить ~{_format_money(daily_gap)}/день - "
            f"например, отказаться от 1–2 необязательных покупок."
        )
    else:
        action = (
            f" Нужно снизить траты минимум на {_format_money(daily_gap)}/день "
            f"(≈{_format_money(daily_gap * max(days_left, 1))} до конца месяца)."
        )

    if top:
        name, amount, share = top
        action += (
            f" Начните с «{name}» - {_format_money(amount)} "
            f"({share:.0f}% расходов)."
        )

    return f"{lead}{action} Подробный план - в блоке рекомендаций ниже."


def _build_summary(
    *,
    projected_month_end: float,
    expense_trend: str,
    expense_change: float,
    avg_daily_income: float,
    avg_daily_expense: float,
    days_left: int,
    confidence: str,
    has_recurring: bool,
    transactions: list | None = None,
    now: datetime | None = None,
) -> str:
    if projected_month_end < 0 and transactions is not None and now is not None:
        return _build_deficit_summary(
            projected_month_end=projected_month_end,
            avg_daily_income=avg_daily_income,
            avg_daily_expense=avg_daily_expense,
            days_left=days_left,
            transactions=transactions,
            now=now,
        )

    trend_text = {
        "up": f"расходы за неделю выросли на {abs(expense_change):.0f}%",
        "down": f"расходы за неделю снизились на {abs(expense_change):.0f}%",
        "stable": "расходы стабильны относительно прошлой недели",
    }[expense_trend]

    recurring_hint = (
        " Учтены регулярные поступления."
        if has_recurring
        else ""
    )

    confidence_hint = ""
    if confidence == "low":
        confidence_hint = " Мало данных - прогноз предварительный."
    elif confidence == "medium":
        confidence_hint = " Прогноз основан на недавней динамике."

    return (
        f"{trend_text.capitalize()}. "
        f"Средний доход ~{avg_daily_income:,.0f} ₽/день, "
        f"расход ~{avg_daily_expense:,.0f} ₽/день. "
        f"При сохранении текущего темпа за {days_left} дн. "
        f"ожидаемый остаток ~{projected_month_end:,.0f} ₽."
        f"{recurring_hint}{confidence_hint}"
    ).replace(",", " ")


def calculate_smart_forecast(
    transactions: list,
    *,
    initial_balance: float = 0.0,
    is_family: bool = False,
    currency: str = "RUB",
) -> dict:
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    month_end = _month_end(now)
    days_left_in_month = max((month_end.date() - now.date()).days, 0)

    all_income = sum(
        float(transaction.amount)
        for transaction in transactions
        if transaction.type == "income"
    )
    all_expense = sum(
        float(transaction.amount)
        for transaction in transactions
        if transaction.type == "expense"
    )
    current_balance = initial_balance + all_income - all_expense

    if not transactions:
        return {
            "current_balance": round(initial_balance, 2),
            "avg_daily_income": 0.0,
            "avg_daily_expense": 0.0,
            "projected_balance_30d": round(initial_balance, 2),
            "projected_balance_month_end": round(initial_balance, 2),
            "savings_rate": 0.0,
            "expense_trend": "stable",
            "expense_trend_percent": 0.0,
            "income_trend": "stable",
            "income_trend_percent": 0.0,
            "confidence": "low",
            "expected_monthly_income": 0.0,
            "expected_monthly_expense": 0.0,
            "summary": (
                "Недостаточно операций для прогноза. "
                "Добавьте доходы и расходы - система выявит динамику и закономерности."
            ),
            "is_family": is_family,
            "currency": currency,
        }

    avg_daily_income, avg_daily_expense, confidence = (
        _weighted_daily_rates(transactions, now)
    )

    expense_trend, expense_change = _compute_trend(
        transactions,
        now,
        "expense",
    )
    income_trend, income_change = _compute_trend(
        transactions,
        now,
        "income",
    )

    trend_multiplier_expense = 1.0
    if expense_trend == "up":
        trend_multiplier_expense += min(expense_change / 100, 0.25) * 0.5
    elif expense_trend == "down":
        trend_multiplier_expense += max(expense_change / 100, -0.25) * 0.5

    trend_multiplier_income = 1.0
    if income_trend == "up":
        trend_multiplier_income += min(income_change / 100, 0.25) * 0.4
    elif income_trend == "down":
        trend_multiplier_income += max(income_change / 100, -0.25) * 0.4

    adjusted_daily_income = avg_daily_income * trend_multiplier_income
    adjusted_daily_expense = avg_daily_expense * trend_multiplier_expense

    recurring = _detect_recurring_income(transactions, now)

    horizon_30 = now + timedelta(days=30)
    recurring_30 = _recurring_income_in_range(
        recurring,
        now,
        horizon_30,
    )
    recurring_month = _recurring_income_in_range(
        recurring,
        now,
        month_end,
    )

    base_flow_30 = (
        adjusted_daily_income - adjusted_daily_expense
    ) * 30
    projected_balance_30d = (
        current_balance + base_flow_30 + recurring_30
    )

    base_flow_month = (
        adjusted_daily_income - adjusted_daily_expense
    ) * days_left_in_month
    projected_balance_month_end = (
        current_balance + base_flow_month + recurring_month
    )

    month_income_so_far = _period_income(
        transactions,
        month_start,
        now,
    )
    month_expense_so_far = _period_expense(
        transactions,
        month_start,
        now,
    )

    expected_monthly_income = (
        month_income_so_far
        + adjusted_daily_income * days_left_in_month
        + recurring_month
    )
    expected_monthly_expense = (
        month_expense_so_far
        + adjusted_daily_expense * days_left_in_month
    )

    savings_rate = 0.0
    if expected_monthly_income > 0:
        savings_rate = (
            (expected_monthly_income - expected_monthly_expense)
            / expected_monthly_income
        ) * 100

    summary = _build_summary(
        projected_month_end=projected_balance_month_end,
        expense_trend=expense_trend,
        expense_change=expense_change,
        avg_daily_income=adjusted_daily_income,
        avg_daily_expense=adjusted_daily_expense,
        days_left=days_left_in_month or 30,
        confidence=confidence,
        has_recurring=bool(recurring),
        transactions=transactions,
        now=now,
    )

    return {
        "current_balance": round(current_balance, 2),
        "avg_daily_income": round(adjusted_daily_income, 2),
        "avg_daily_expense": round(adjusted_daily_expense, 2),
        "projected_balance_30d": round(projected_balance_30d, 2),
        "projected_balance_month_end": round(
            projected_balance_month_end,
            2,
        ),
        "savings_rate": round(savings_rate, 2),
        "expense_trend": expense_trend,
        "expense_trend_percent": expense_change,
        "income_trend": income_trend,
        "income_trend_percent": income_change,
        "confidence": confidence,
        "expected_monthly_income": round(expected_monthly_income, 2),
        "expected_monthly_expense": round(expected_monthly_expense, 2),
        "summary": summary,
        "is_family": is_family,
        "currency": currency,
    }
