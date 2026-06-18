from datetime import datetime, timedelta
from collections import defaultdict

import models
from ai.forecasting.smart_forecast import calculate_smart_forecast
from ai.recommendations.insights import (
    _money,
    deficit_action_recommendations,
    dominant_expense_categories,
    filter_transactions,
    top_category_growth,
)


def _month_bounds():
    now = datetime.utcnow()
    start = datetime(now.year, now.month, 1)
    prev_start = datetime(
        now.year if now.month > 1 else now.year - 1,
        now.month - 1 if now.month > 1 else 12,
        1,
    )
    return now, start, prev_start


def _get_family_transactions(
    db,
    family_id: int,
    member_ids: list[int],
):
    return (
        db.query(models.Transaction)
        .filter(
            models.Transaction.user_id.in_(member_ids),
            models.Transaction.is_deleted == False,
        )
        .all()
    )


def generate_family_recommendations(
    db,
    family: models.Family,
    member_ids: list[int],
) -> list[dict]:
    now, month_start, prev_start = _month_bounds()

    transactions = _get_family_transactions(
        db,
        family.id,
        member_ids,
    )

    if not transactions:
        return [{
            "id": "family_empty_data",
            "type": "info",
            "priority": "low",
            "title": "Совместный бюджет пуст",
            "message": (
                "Добавьте операции участников - "
                "появятся выводы по распределению трат и прогнозу семьи."
            ),
            "action": "Перейдите в кошелёк",
        }]

    this_month = filter_transactions(
        transactions,
        month_start,
        now,
    )
    last_month = filter_transactions(
        transactions,
        prev_start,
        month_start,
    )

    income = sum(
        float(transaction.amount)
        for transaction in this_month
        if transaction.type == "income"
    )
    expense = sum(
        float(transaction.amount)
        for transaction in this_month
        if transaction.type == "expense"
    )

    recommendations: list[dict] = []

    for item in top_category_growth(this_month, last_month)[:2]:
        recommendations.append({
            "id": f"family_trend_{item['category']}",
            "type": "trend_up",
            "priority": "high",
            "title": f"Семья: рост «{item['category']}»",
            "message": (
                f"Совместные траты выросли с {_money(item['previous'])} "
                f"до {_money(item['current'])} "
                f"(+{item['change_pct']:.0f}%)."
            ),
            "action": "Проверьте, кто из участников дал основной прирост",
            "category": item["category"],
        })

    for item in dominant_expense_categories(this_month, expense, 0.40)[:1]:
        recommendations.append({
            "id": f"family_concentration_{item['category']}",
            "type": "concentration",
            "priority": "medium",
            "title": f"Доля семейных трат: {item['category']}",
            "message": (
                f"«{item['category']}» - {item['share_pct']:.0f}% "
                f"расходов семьи ({_money(item['amount'])} "
                f"из {_money(expense)})."
            ),
            "action": "Сравните с лимитами и прошлым месяцем",
            "category": item["category"],
        })

    payer_totals: dict[int, float] = defaultdict(float)

    for transaction in this_month:
        if transaction.type != "expense":
            continue
        payer_id = transaction.payer_user_id or transaction.user_id
        payer_totals[payer_id] += float(transaction.amount)

    if expense > 0 and len(payer_totals) > 1:
        for payer_id, total in sorted(
            payer_totals.items(),
            key=lambda pair: pair[1],
            reverse=True,
        ):
            share = (total / expense) * 100
            if share < 60:
                break

            user = (
                db.query(models.User)
                .filter(models.User.id == payer_id)
                .first()
            )
            name = user.name if user else f"Участник #{payer_id}"

            member = (
                db.query(models.FamilyMember)
                .filter(
                    models.FamilyMember.family_id == family.id,
                    models.FamilyMember.user_id == payer_id,
                )
                .first()
            )
            role = member.family_role if member else ""

            recommendations.append({
                "id": f"family_uneven_{payer_id}",
                "type": "uneven_split",
                "priority": "high",
                "title": "Неравномерная нагрузка по оплатам",
                "message": (
                    f"{name}{f' ({role})' if role else ''} оплатил(а) "
                    f"{share:.0f}% семейных расходов "
                    f"({_money(total)} из {_money(expense)})."
                ),
                "action": "Обсудите перераспределение или компенсацию",
            })
            break

    growth = top_category_growth(this_month, last_month)

    if income > expense > 0:
        surplus = income - expense
        rate = (surplus / income) * 100
        if rate >= 15:
            recommendations.append({
                "id": "family_surplus",
                "type": "save_opportunity",
                "priority": "medium",
                "title": "У семьи хороший остаток",
                "message": (
                    f"В этом месяце свободно {_money(surplus)} "
                    f"({rate:.0f}% дохода). Обсудите, какую часть "
                    f"направить в общую цель или резерв - "
                    f"например, {_money(surplus * 0.25)} в начале следующего месяца."
                ),
                "action": "Создайте цель в кошельке и пополняйте вместе",
            })

    forecast = calculate_smart_forecast(
        transactions,
        initial_balance=family.initial_balance or 0.0,
        is_family=True,
        currency=family.currency or "RUB",
    )

    family_goals = (
        db.query(models.FinancialGoal)
        .filter(
            models.FinancialGoal.family_id == family.id,
            models.FinancialGoal.is_completed == False,
        )
        .all()
    )

    if now.month == 12:
        month_end = datetime(now.year + 1, 1, 1) - timedelta(seconds=1)
    else:
        month_end = datetime(now.year, now.month + 1, 1) - timedelta(seconds=1)
    days_left = max((month_end.date() - now.date()).days, 0)

    for item in deficit_action_recommendations(
        income=income,
        expense=expense,
        projected_balance=forecast["projected_balance_month_end"],
        avg_daily_income=forecast["avg_daily_income"],
        avg_daily_expense=forecast["avg_daily_expense"],
        days_left=days_left,
        this_month=this_month,
        last_month=last_month,
        growth=growth,
        goals=family_goals,
        scope_label="Семья",
    ):
        recommendations.append(item)

    priority_order = {"high": 0, "medium": 1, "low": 2}
    recommendations.sort(
        key=lambda item: priority_order.get(item["priority"], 3)
    )

    return recommendations[:6]


def calculate_family_forecast(
    db,
    family: models.Family,
    member_ids: list[int],
) -> dict:
    transactions = _get_family_transactions(
        db,
        family.id,
        member_ids,
    )

    return calculate_smart_forecast(
        transactions,
        initial_balance=family.initial_balance or 0.0,
        is_family=True,
        currency=family.currency or "RUB",
    )
