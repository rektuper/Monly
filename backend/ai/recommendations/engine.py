from datetime import datetime, timedelta

from collections import defaultdict



import models

from ai.forecasting.smart_forecast import (

    calculate_smart_forecast,

    _detect_recurring_income,

)

from ai.recommendations.insights import (

    _money,

    deficit_action_recommendations,

    dominant_expense_categories,

    emergency_buffer_recommendation,

    expense_improvement_recommendation,

    filter_transactions,

    find_expense_anomalies,

    goal_gap_messages,

    income_growth_recommendation,

    micro_spending_leak,

    monthly_financial_snapshots,

    positive_surplus_recommendations,

    savings_context,

    top_category_growth,

    weekday_spending_pattern,

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





def _load_goals(

    db,

    user_id: int,

    family_id: int | None,

) -> list:

    query = db.query(models.FinancialGoal).filter(

        models.FinancialGoal.is_completed == False,

    )



    if family_id:

        query = query.filter(

            models.FinancialGoal.family_id == family_id,

        )

    else:

        query = query.filter(

            models.FinancialGoal.user_id == user_id,

            models.FinancialGoal.family_id.is_(None),

        )



    return query.all()





def _load_budgets(db, user_id: int) -> list:

    return (

        db.query(models.CategoryBudget)

        .filter(models.CategoryBudget.user_id == user_id)

        .all()

    )





def _append_unique(recommendations: list[dict], item: dict) -> None:

    if any(existing["id"] == item["id"] for existing in recommendations):

        return

    recommendations.append(item)





def generate_recommendations(

    db,

    user_id: int,

    transaction_user_ids: list[int] | None = None,

    family_id: int | None = None,

) -> list[dict]:

    now, month_start, prev_start = _month_bounds()

    scope_ids = transaction_user_ids or [user_id]



    transactions = (

        db.query(models.Transaction)

        .filter(

            models.Transaction.user_id.in_(scope_ids),

            models.Transaction.is_deleted == False,

        )

        .all()

    )



    if not transactions:

        return [{

            "id": "empty_data",

            "type": "info",

            "priority": "low",

            "title": "Недостаточно данных",

            "message": (

                "Добавьте или импортируйте операции - "

                "система построит рекомендации по фактической динамике."

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

    if not this_month and transactions:
        rolling_start = now - timedelta(days=30)
        rolling_prev_start = now - timedelta(days=60)
        this_month = filter_transactions(
            transactions,
            rolling_start,
            now,
        )
        last_month = filter_transactions(
            transactions,
            rolling_prev_start,
            rolling_start,
        )



    recommendations: list[dict] = []



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

    last_income = sum(

        float(transaction.amount)

        for transaction in last_month

        if transaction.type == "income"

    )

    last_expense = sum(

        float(transaction.amount)

        for transaction in last_month

        if transaction.type == "expense"

    )



    snapshots = monthly_financial_snapshots(transactions, now, months=4)

    goals = _load_goals(db, user_id, family_id)

    recurring = _detect_recurring_income(transactions, now)



    for item in positive_surplus_recommendations(

        snapshots,

        goals,

        now,

        recurring_income=recurring,

    ):

        _append_unique(recommendations, item)



    growth = top_category_growth(this_month, last_month)



    for item in growth[:2]:

        _append_unique(recommendations, {

            "id": f"trend_up_{item['category']}",

            "type": "trend_up",

            "priority": "high" if item["change_pct"] >= 40 else "medium",

            "title": f"Рост трат: {item['category']}",

            "message": (

                f"«{item['category']}»: {_money(item['current'])} "

                f"в этом месяце против {_money(item['previous'])} "

                f"в прошлом (+{item['change_pct']:.0f}%, "

                f"+{_money(item['delta'])})."

            ),

            "action": "Проверьте, какие операции дали основной прирост",

            "category": item["category"],

        })



    savings = savings_context(income, expense, growth)

    if savings and savings["deficit"] <= 0:
        message = (
            f"Свободный остаток {savings['savings_rate']:.1f}% от дохода - "
            f"ниже комфортного уровня."
        )

        if savings["top_growth"]:
            drivers = ", ".join(
                f"«{item['category']}» (+{_money(item['delta'])})"
                for item in savings["top_growth"]
            )
            message += f" Основной рост: {drivers}."

        _append_unique(recommendations, {
            "id": "low_savings",
            "type": "savings_rate",
            "priority": "high",
            "title": "Давление на бюджет",
            "message": message,
            "action": "Сфокусируйтесь на категориях с наибольшим приростом",
        })



    expense_improved = expense_improvement_recommendation(

        expense,

        last_expense,

    )

    if expense_improved:

        _append_unique(recommendations, expense_improved)



    income_up = income_growth_recommendation(

        income,

        last_income,

        expense,

    )

    if income_up:

        _append_unique(recommendations, income_up)



    micro_leak = micro_spending_leak(this_month, expense)

    if micro_leak and expense <= income:

        _append_unique(recommendations, micro_leak)



    for item in dominant_expense_categories(this_month, expense, 0.35)[:1]:

        _append_unique(recommendations, {

            "id": f"concentration_{item['category']}",

            "type": "concentration",

            "priority": "medium",

            "title": f"Концентрация расходов: {item['category']}",

            "message": (

                f"Категория «{item['category']}» - "

                f"{item['share_pct']:.0f}% всех трат месяца "

                f"({_money(item['amount'])} из {_money(expense)})."

            ),

            "action": "Сравните с прошлым месяцем в аналитике",

            "category": item["category"],

        })



    category_expense = category_totals_dict(this_month)



    for budget in _load_budgets(db, user_id):

        category = (

            db.query(models.UserCategory)

            .filter(models.UserCategory.id == budget.category_id)

            .first()

        )

        if not category:

            continue



        spent = category_expense.get(category.name, 0)

        if spent > budget.monthly_limit:

            over = spent - budget.monthly_limit

            _append_unique(recommendations, {

                "id": f"overspend_{category.id}",

                "type": "overspend",

                "priority": "high",

                "title": f"Лимит превышен: {category.name}",

                "message": (

                    f"Потрачено {_money(spent)} при лимите "

                    f"{_money(budget.monthly_limit)} "

                    f"(+{_money(over)})."

                ),

                "action": "Пересмотрите лимит или операции в категории",

                "category": category.name,

            })



    net_monthly = income - expense

    for item in goal_gap_messages(goals, net_monthly, now):

        _append_unique(recommendations, item)



    for anomaly in find_expense_anomalies(this_month)[:2]:

        desc = (

            f" («{anomaly['description'][:40]}»)"

            if anomaly["description"]

            else ""

        )

        _append_unique(recommendations, {

            "id": f"anomaly_{anomaly['category']}_{int(anomaly['amount'])}",

            "type": "anomaly",

            "priority": "medium",

            "title": f"Нетипичная операция: {anomaly['category']}",

            "message": (

                f"{_money(anomaly['amount'])} {desc} - "

                f"в {anomaly['amount'] / max(anomaly['average'], 1):.1f}× "

                f"выше среднего по категории ({_money(anomaly['average'])})."

            ),

            "action": "Проверьте категорию и описание операции",

            "category": anomaly["category"],

        })



    weekend = weekday_spending_pattern(this_month)

    if weekend and expense <= income:

        _append_unique(recommendations, {

            "id": "weekend_pattern",

            "type": "weekday_pattern",

            "priority": "low",

            "title": "Пик трат в выходные",

            "message": (

                f"Средний расход в выходной "

                f"{_money(weekend['weekend_avg'])} против "

                f"{_money(weekend['weekday_avg'])} в будни "

                f"(×{weekend['ratio']:.1f})."

            ),

            "action": "Заложите отдельный лимит на субботу–воскресенье",

        })



    forecast = calculate_smart_forecast(transactions)



    buffer_tip = emergency_buffer_recommendation(

        snapshots,

        forecast["avg_daily_expense"],

        forecast["projected_balance_month_end"],

    )

    if buffer_tip:

        _append_unique(recommendations, buffer_tip)



    now, _, _ = _month_bounds()
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
        goals=goals,
    ):
        _append_unique(recommendations, item)

    if (
        forecast["projected_balance_month_end"] >= 0
        and forecast["expense_trend"] == "up"
        and forecast["expense_trend_percent"] >= 12
    ):

        _append_unique(recommendations, {

            "id": "forecast_expense_growth",

            "type": "forecast",

            "priority": "medium",

            "title": "Ускорение расходов",

            "message": (

                f"За неделю траты выросли на "

                f"{forecast['expense_trend_percent']:.0f}%. "

                f"Прогноз к концу месяца: "

                f"{_money(forecast['projected_balance_month_end'])}."

            ),

            "action": "Сравните категории с прошлой неделей",

        })



    if not recommendations:

        if income > expense > 0:

            rate = ((income - expense) / income) * 100

            surplus = income - expense

            _append_unique(recommendations, {

                "id": "stable_budget",

                "type": "info",

                "priority": "low",

                "title": "Бюджет в норме",

                "message": (

                    f"За месяц остаётся {rate:.1f}% дохода "

                    f"({_money(surplus)}). "

                    f"Резких отклонений нет - можно направить часть "

                    f"остатка в цель или накопления."

                ),

                "action": "Откройте «Цели» в кошельке",

            })

        else:

            _append_unique(recommendations, {

                "id": "collect_more_data",

                "type": "info",

                "priority": "low",

                "title": "Собираем статистику",

                "message": (

                    "Пока мало операций для детальных выводов. "

                    "После 2–3 недель истории появятся тренды и аномалии."

                ),

                "action": None,

            })



    priority_order = {"high": 0, "medium": 1, "low": 2}

    recommendations.sort(

        key=lambda item: priority_order.get(item["priority"], 3)

    )



    return recommendations[:12]





def category_totals_dict(this_month: list) -> dict[str, float]:

    totals: dict[str, float] = defaultdict(float)



    for transaction in this_month:

        if transaction.type != "expense" or not transaction.category:

            continue

        totals[transaction.category.name] += float(transaction.amount)



    return dict(totals)


