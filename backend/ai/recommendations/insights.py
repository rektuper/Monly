from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta


def _dt(value: datetime) -> datetime:
    if value.tzinfo is not None:
        return value.replace(tzinfo=None)
    return value


def _money(amount: float) -> str:
    return f"{amount:,.0f} ₽".replace(",", " ")


def filter_transactions(
    transactions: list,
    start: datetime,
    end: datetime,
) -> list:
    return [
        transaction
        for transaction in transactions
        if start <= _dt(transaction.transaction_date) <= end
    ]


def category_totals(
    transactions: list,
    tx_type: str = "expense",
) -> dict[str, float]:
    totals: dict[str, float] = defaultdict(float)

    for transaction in transactions:
        if transaction.type != tx_type:
            continue
        if not transaction.category:
            continue
        totals[transaction.category.name] += float(transaction.amount)

    return dict(totals)


def top_category_growth(
    this_month: list,
    last_month: list,
    min_prev: float = 500,
    min_change_pct: float = 20,
) -> list[dict]:
    current = category_totals(this_month)
    previous = category_totals(last_month)
    results = []

    for name, total in current.items():
        prev = previous.get(name, 0)
        if prev < min_prev:
            continue
        change_pct = ((total - prev) / prev) * 100
        if change_pct >= min_change_pct:
            results.append({
                "category": name,
                "current": total,
                "previous": prev,
                "delta": total - prev,
                "change_pct": change_pct,
            })

    results.sort(key=lambda item: item["delta"], reverse=True)
    return results


def dominant_expense_categories(
    this_month: list,
    expense_total: float,
    min_share: float = 0.30,
) -> list[dict]:
    if expense_total <= 0:
        return []

    totals = category_totals(this_month)
    items = []

    for name, total in totals.items():
        share = total / expense_total
        if share >= min_share:
            items.append({
                "category": name,
                "amount": total,
                "share_pct": share * 100,
            })

    items.sort(key=lambda item: item["amount"], reverse=True)
    return items


def find_expense_anomalies(
    this_month: list,
    min_operations: int = 3,
    multiplier: float = 3.0,
) -> list[dict]:
    by_category: dict[str, list] = defaultdict(list)

    for transaction in this_month:
        if transaction.type != "expense" or not transaction.category:
            continue
        by_category[transaction.category.name].append(transaction)

    anomalies = []

    for category, group in by_category.items():
        if len(group) < min_operations:
            continue

        amounts = [float(transaction.amount) for transaction in group]
        avg = sum(amounts) / len(amounts)
        worst = max(group, key=lambda transaction: float(transaction.amount))
        worst_amount = float(worst.amount)

        if worst_amount > avg * multiplier:
            anomalies.append({
                "category": category,
                "amount": worst_amount,
                "average": avg,
                "date": _dt(worst.transaction_date),
                "description": worst.description or "",
            })

    anomalies.sort(key=lambda item: item["amount"], reverse=True)
    return anomalies


def weekday_spending_pattern(this_month: list) -> dict | None:
    expenses = [
        transaction
        for transaction in this_month
        if transaction.type == "expense"
    ]

    if len(expenses) < 8:
        return None

    weekday_totals = [0.0] * 7
    weekday_counts = [0] * 7

    for transaction in expenses:
        day = _dt(transaction.transaction_date).weekday()
        weekday_totals[day] += float(transaction.amount)
        weekday_counts[day] += 1

    weekend_total = weekday_totals[5] + weekday_totals[6]
    weekday_total = sum(weekday_totals[:5])

    if weekday_total <= 0 or weekend_total <= 0:
        return None

    weekend_days = max(weekday_counts[5] + weekday_counts[6], 1)
    weekday_days = max(sum(weekday_counts[:5]), 1)

    weekend_avg = weekend_total / weekend_days
    weekday_avg = weekday_total / weekday_days

    if weekend_avg <= weekday_avg * 1.25:
        return None

    return {
        "weekend_avg": weekend_avg,
        "weekday_avg": weekday_avg,
        "ratio": weekend_avg / weekday_avg,
    }


def savings_context(
    income: float,
    expense: float,
    category_growth: list[dict],
) -> dict | None:
    if income <= 0:
        return None

    savings_rate = ((income - expense) / income) * 100
    deficit = expense - income

    if savings_rate >= 10:
        return None

    return {
        "savings_rate": savings_rate,
        "deficit": deficit,
        "top_growth": category_growth[:2],
    }


def goal_gap_messages(
    goals: list,
    net_monthly: float,
    now: datetime,
) -> list[dict]:
    messages = []
    stalled: list[tuple] = []

    for goal in goals:
        if goal.is_completed:
            continue

        remaining = float(goal.target_amount) - float(goal.current_amount)
        if remaining <= 0:
            continue

        if net_monthly <= 0:
            stalled.append((goal, remaining))
            continue

        if not goal.deadline:
            continue

        days_left = (_dt(goal.deadline) - now).days
        if days_left <= 0:
            continue

        days_needed = remaining / (net_monthly / max(now.day, 1))
        if days_needed > days_left:
            shortfall = remaining - (net_monthly / max(now.day, 1)) * days_left
            messages.append({
                "id": f"goal_risk_{goal.id}",
                "type": "goal_risk",
                "priority": "high",
                "title": f"Цель «{goal.title}» отстаёт от плана",
                "message": (
                    f"Нужно {_money(remaining)} за {days_left} дн., "
                    f"при текущем темпе (~{_money(net_monthly / max(now.day, 1))}/день) "
                    f"не хватает примерно {_money(max(shortfall, 0))}."
                ),
                "action": "Увеличьте ежемесячный взнос или сдвиньте дедлайн",
            })

    if stalled:
        names = ", ".join(f"«{goal.title}»" for goal, _ in stalled[:3])
        if len(stalled) > 3:
            names += f" и ещё {len(stalled) - 3}"

        total_remaining = sum(remaining for _, remaining in stalled)
        messages.insert(0, {
            "id": "goals_stalled_deficit",
            "type": "goal_risk",
            "priority": "high",
            "title": "Цели не пополняются",
            "message": (
                f"За месяц свободный остаток {_money(net_monthly)}, "
                f"накопления по целям ({names}) не двигаются. "
                f"Всего до целей осталось {_money(total_remaining)} - "
                f"сначала выровняйте бюджет, потом возвращайтесь к взносам."
            ),
            "action": "Сократите расходы или пополните цели вручную в кошельке",
        })

    return messages[:2]


def _month_end(year: int, month: int) -> datetime:
    if month == 12:
        return datetime(year + 1, 1, 1) - timedelta(seconds=1)
    return datetime(year, month + 1, 1) - timedelta(seconds=1)


def _prev_month(year: int, month: int) -> tuple[int, int]:
    if month == 1:
        return year - 1, 12
    return year, month - 1


def monthly_financial_snapshots(
    transactions: list,
    now: datetime,
    months: int = 4,
) -> list[dict]:
    snapshots: list[dict] = []
    year, month = now.year, now.month

    for index in range(months):
        start = datetime(year, month, 1)
        is_partial = index == 0
        end = now if is_partial else _month_end(year, month)

        chunk = filter_transactions(transactions, start, end)
        income = sum(
            float(item.amount)
            for item in chunk
            if item.type == "income"
        )
        expense = sum(
            float(item.amount)
            for item in chunk
            if item.type == "expense"
        )
        net = income - expense
        savings_rate = (net / income * 100) if income > 0 else 0.0

        snapshots.append({
            "year": year,
            "month": month,
            "income": income,
            "expense": expense,
            "net": net,
            "savings_rate": savings_rate,
            "is_partial": is_partial,
        })

        year, month = _prev_month(year, month)

    return snapshots


def expense_improvement_recommendation(
    this_month_expense: float,
    last_month_expense: float,
) -> dict | None:
    if last_month_expense < 3000:
        return None

    delta = last_month_expense - this_month_expense
    if delta <= 0:
        return None

    change_pct = (delta / last_month_expense) * 100
    if change_pct < 8:
        return None

    return {
        "id": "expense_improved",
        "type": "expense_down",
        "priority": "low",
        "title": "Расходы ниже прошлого месяца",
        "message": (
            f"Вы уже потратили на {_money(delta)} меньше, чем в прошлом месяце "
            f"({change_pct:.0f}%). Если это не разовая экономия - "
            f"хороший момент перевести часть разницы в накопления."
        ),
        "action": "Пополните цель в кошельке, пока привычка свежая",
    }


def income_growth_recommendation(
    this_month_income: float,
    last_month_income: float,
    this_month_expense: float,
) -> dict | None:
    if last_month_income < 5000:
        return None

    delta = this_month_income - last_month_income
    if delta <= 0:
        return None

    change_pct = (delta / last_month_income) * 100
    if change_pct < 10:
        return None

    free = max(this_month_income - this_month_expense, 0)
    save_hint = ""
    if free > 0:
        save_hint = (
            f" Свободный остаток месяца ~{_money(free)} - "
            f"имеет смысл сразу отложить хотя бы {change_pct:.0f}% прироста."
        )

    return {
        "id": "income_growth",
        "type": "income_up",
        "priority": "medium",
        "title": "Доход вырос - зафиксируйте прирост",
        "message": (
            f"Доходы в этом месяце на {_money(delta)} выше прошлого "
            f"(+{change_pct:.0f}%).{save_hint}"
        ),
        "action": "Не тратьте весь прирост - направьте часть в цель или резерв",
    }


def micro_spending_leak(this_month: list, expense_total: float) -> dict | None:
    if expense_total < 5000:
        return None

    by_category: dict[str, list[float]] = defaultdict(list)

    for transaction in this_month:
        if transaction.type != "expense" or not transaction.category:
            continue
        amount = float(transaction.amount)
        if amount <= 800:
            by_category[transaction.category.name].append(amount)

    best = None

    for category, amounts in by_category.items():
        if len(amounts) < 6:
            continue

        total = sum(amounts)
        share = total / expense_total

        if share < 0.12:
            continue

        if not best or total > best["total"]:
            best = {
                "category": category,
                "count": len(amounts),
                "total": total,
                "share_pct": share * 100,
            }

    if not best:
        return None

    return {
        "id": f"micro_leak_{best['category']}",
        "type": "micro_spending",
        "priority": "medium",
        "title": f"Мелкие траты копятся: {best['category']}",
        "message": (
            f"«{best['category']}»: {best['count']} небольших покупок на "
            f"{_money(best['total'])} ({best['share_pct']:.0f}% расходов месяца). "
            f"Часто именно такие траты «съедают» профицит незаметно."
        ),
        "action": "Поставьте недельный лимит или объедините мелкие покупки",
        "category": best["category"],
    }


def _suggest_category_cut(
    category: str,
    amount: float,
    target_savings: float,
) -> tuple[float, float]:
    if amount <= 0 or target_savings <= 0:
        return 0.0, 0.0

    needed_pct = min((target_savings / amount) * 100, 40)
    needed_pct = max(needed_pct, 10)
    cut_amount = amount * (needed_pct / 100)
    return cut_amount, needed_pct


def deficit_action_recommendations(
    *,
    income: float,
    expense: float,
    projected_balance: float,
    avg_daily_income: float,
    avg_daily_expense: float,
    days_left: int,
    this_month: list,
    last_month: list,
    growth: list[dict],
    goals: list,
    scope_label: str = "",
) -> list[dict]:
    in_deficit = projected_balance < 0 or expense > income
    if not in_deficit:
        return []

    prefix = f"{scope_label}: " if scope_label else ""
    daily_gap = max(avg_daily_expense - avg_daily_income, 0)
    period_deficit = max(expense - income, 0)
    month_end_gap = abs(min(projected_balance, 0))
    savings_target = max(
        daily_gap * max(days_left, 1),
        period_deficit,
        month_end_gap,
    )

    top_categories = dominant_expense_categories(
        this_month,
        expense,
        0.10,
    )
    active_goals = [
        goal
        for goal in goals
        if not goal.is_completed
        and float(goal.target_amount) > float(goal.current_amount)
    ]

    recommendations: list[dict] = []

    plan_steps: list[str] = []

    if daily_gap > 0:
        plan_steps.append(
            f"снизьте средний расход на {_money(daily_gap)}/день "
            f"(≈{_money(daily_gap * max(days_left, 1))} до конца месяца)"
        )
    elif period_deficit > 0:
        plan_steps.append(
            f"уменьшите расходы минимум на {_money(period_deficit)} "
            f"в оставшуюся часть месяца"
        )

    if top_categories:
        top = top_categories[0]
        cut_amount, cut_pct = _suggest_category_cut(
            top["category"],
            top["amount"],
            savings_target,
        )
        if cut_amount > 0:
            plan_steps.append(
                f"сократите «{top['category']}» на {_money(cut_amount)} "
                f"(~{cut_pct:.0f}% - сейчас {_money(top['amount'])}, "
                f"{top['share_pct']:.0f}% всех трат)"
            )

    if active_goals:
        titles = ", ".join(
            f"«{goal.title}»" for goal in active_goals[:2]
        )
        if len(active_goals) > 2:
            titles += f" и ещё {len(active_goals) - 2}"
        plan_steps.append(
            f"временно приостановите взносы по целям ({titles}) - "
            f"сначала выровняйте баланс"
        )

    if not plan_steps:
        plan_steps.append(
            "отмените необязательные подписки и отложите крупные покупки "
            "до конца месяца"
        )

    forecast_line = (
        f"Прогноз к концу месяца - {_money(projected_balance)}."
        if projected_balance < 0
        else f"Расходы уже превышают доходы на {_money(period_deficit)}."
    )

    recommendations.append({
        "id": "deficit_recovery_plan",
        "type": "deficit_recovery",
        "priority": "high",
        "title": f"{prefix}План выхода из минуса",
        "message": (
            f"{forecast_line} Чтобы не углублять дефицит: "
            + "; ".join(plan_steps[:3])
            + "."
        ),
        "action": "Откройте аналитику → «Структура расходов» и сравните с прошлым месяцем",
    })

    if growth:
        item = growth[0]
        rollback = min(item["delta"], savings_target)
        recommendations.append({
            "id": f"deficit_rollback_{item['category']}",
            "type": "deficit_recovery",
            "priority": "high",
            "title": f"Верните «{item['category']}» к прошлому уровню",
            "message": (
                f"За месяц категория выросла с {_money(item['previous'])} "
                f"до {_money(item['current'])} (+{_money(item['delta'])}, "
                f"+{item['change_pct']:.0f}%). Если вернуть траты хотя бы "
                f"к прошлому месяцу - в бюджет вернётся {_money(rollback)}. "
                f"Проверьте, какие операции дали основной прирост."
            ),
            "action": "Отфильтруйте эту категорию в списке операций",
            "category": item["category"],
        })

    if top_categories:
        top = top_categories[0]
        if top["share_pct"] >= 22:
            expense_days = [
                _dt(transaction.transaction_date).day
                for transaction in this_month
                if transaction.type == "expense"
            ]
            days_in_period = max(expense_days) if expense_days else 1
            weekly_spent = top["amount"] / max(days_in_period / 7, 1)
            weekly_limit = weekly_spent * 0.80

            recommendations.append({
                "id": f"deficit_limit_{top['category']}",
                "type": "deficit_recovery",
                "priority": "medium",
                "title": f"Лимит на «{top['category']}»",
                "message": (
                    f"Категория забирает {top['share_pct']:.0f}% расходов "
                    f"({_money(top['amount'])}). Поставьте жёсткий лимит "
                    f"~{_money(weekly_limit)}/неделю (−20% от текущего темпа) - "
                    f"это самый быстрый способ удержать бюджет под контролем."
                ),
                "action": "Создайте лимит по категории в целях кошелька",
                "category": top["category"],
            })

    weekend = weekday_spending_pattern(this_month)
    if weekend and daily_gap > 0:
        weekend_saving = (weekend["weekend_avg"] - weekend["weekday_avg"]) * 2
        if weekend_saving >= daily_gap * 2:
            recommendations.append({
                "id": "deficit_weekend_cap",
                "type": "deficit_recovery",
                "priority": "medium",
                "title": "Сократите траты в выходные",
                "message": (
                    f"В выходные вы тратите в среднем {_money(weekend['weekend_avg'])} "
                    f"против {_money(weekend['weekday_avg'])} в будни "
                    f"(×{weekend['ratio']:.1f}). Если удержать выходные "
                    f"на уровне будней - сэкономите ~{_money(weekend_saving)}/неделю, "
                    f"это закроет часть дефицита без жёсткой экономии в будни."
                ),
                "action": "Запланируйте бюджет на субботу–воскресенье заранее",
            })

    micro = micro_spending_leak(this_month, expense)
    if micro:
        recommendations.append({
            **micro,
            "priority": "medium",
            "title": (
                f"При минусе режьте мелкие траты: "
                f"{micro.get('category', '')}"
            ),
            "action": (
                "Отмените импульсные покупки в этой категории на 2 недели"
            ),
        })

    if income > 0 and avg_daily_income < avg_daily_expense:
        gap_to_cover = savings_target
        recommendations.append({
            "id": "deficit_income_expense_balance",
            "type": "deficit_recovery",
            "priority": "medium",
            "title": "Сначала закройте разрыв доход/расход",
            "message": (
                f"Сейчас {_money(avg_daily_income)}/день дохода против "
                f"{_money(avg_daily_expense)}/день расходов. "
                f"Пока разрыв не закрыт, любые новые покупки увеличат минус. "
                f"Приоритет: обязательные траты → отложить необязательное → "
                f"цели и накопления. Нужно высвободить ~{_money(gap_to_cover)} "
                f"до конца месяца."
            ),
            "action": "Составьте список трат «можно отложить» на 2–4 недели",
        })

    priority_order = {"high": 0, "medium": 1, "low": 2}
    recommendations.sort(
        key=lambda item: priority_order.get(item["priority"], 3)
    )

    seen_ids: set[str] = set()
    unique: list[dict] = []
    for item in recommendations:
        if item["id"] in seen_ids:
            continue
        seen_ids.add(item["id"])
        unique.append(item)

    return unique[:5]


def positive_surplus_recommendations(
    snapshots: list[dict],
    goals: list,
    now: datetime,
    recurring_income: list[dict] | None = None,
) -> list[dict]:
    messages: list[dict] = []
    if not snapshots:
        return messages

    full_months = [
        item for item in snapshots if not item["is_partial"]
    ]
    profitable = [
        item
        for item in full_months
        if item["net"] >= 3000
        and item["income"] > 0
        and item["savings_rate"] >= 10
    ]

    if len(profitable) >= 2:
        sample = profitable[:3]
        avg_net = sum(item["net"] for item in sample) / len(sample)
        avg_rate = sum(item["savings_rate"] for item in sample) / len(sample)
        auto_save = max(avg_net * 0.25, 1000)

        messages.append({
            "id": "surplus_streak",
            "type": "save_opportunity",
            "priority": "high",
            "title": "Стабильный остаток - самое время копить",
            "message": (
                f"Уже {len(profitable)} полных месяца подряд в среднем остаётся "
                f"{_money(avg_net)} ({avg_rate:.0f}% дохода). "
                f"Это устойчивый профицит: имеет смысл автоматически откладывать "
                f"~{_money(auto_save)} в начале месяца - на вклад, цель или подушку."
            ),
            "action": "Создайте цель в кошельке или перевод в день зарплаты",
        })

    current = snapshots[0]
    if (
        current["is_partial"]
        and current["income"] >= 5000
        and current["net"] > 0
        and current["savings_rate"] >= 20
        and now.day >= 12
    ):
        projected = current["net"]
        if now.day > 0:
            projected = (current["net"] / now.day) * max(
                (_month_end(now.year, now.month) - datetime(
                    now.year, now.month, 1
                )).days + 1,
                now.day,
            )

        messages.append({
            "id": "current_month_surplus",
            "type": "save_opportunity",
            "priority": "medium",
            "title": "В этом месяце хороший запас",
            "message": (
                f"Сейчас свободно {_money(current['net'])} "
                f"({current['savings_rate']:.0f}% дохода). "
                f"Если темп сохранится, к концу месяца останется около "
                f"{_money(projected)} - можно заранее решить, куда их направить."
            ),
            "action": "Отложите часть остатка на цель, пока он не ушёл в импульсные траты",
        })

    active_goals = [
        goal for goal in goals if not goal.is_completed
    ]
    avg_net = (
        sum(item["net"] for item in profitable[:2]) / len(profitable[:2])
        if len(profitable) >= 1
        else current["net"]
    )

    if active_goals and avg_net >= 2000 and not any(
        item.get("type") == "goal_risk" for item in messages
    ):
        ranked = []
        for goal in active_goals:
            remaining = float(goal.target_amount) - float(goal.current_amount)
            if remaining <= 0:
                continue
            months_left = remaining / avg_net
            ranked.append((months_left, goal, remaining))

        ranked.sort(key=lambda item: item[0])

        if ranked:
            months_left, goal, remaining = ranked[0]
            monthly_chunk = min(avg_net * 0.3, remaining)
            months_left_with_save = remaining / max(monthly_chunk, 1)

            messages.append({
                "id": f"goal_boost_{goal.id}",
                "type": "goal_boost",
                "priority": "medium",
                "title": f"Ускорить цель «{goal.title}»",
                "message": (
                    f"При вашем среднем остатке {_money(avg_net)}/мес. "
                    f"до цели осталось {_money(remaining)}. "
                    f"Если откладывать ~{_money(monthly_chunk)} ежемесячно, "
                    f"накопите за ~{max(months_left_with_save, 1):.0f} мес. "
                    f"вместо ~{max(months_left, 1):.0f}."
                ),
                "action": "Пополните цель в кошельке в день поступления дохода",
            })

    elif not active_goals and avg_net >= 5000 and len(profitable) >= 1:
        if not any(item.get("id") == "surplus_streak" for item in messages):
            messages.append({
                "id": "create_savings_goal",
                "type": "create_goal",
                "priority": "medium",
                "title": "Остаток есть - добавьте цель",
                "message": (
                    f"В среднем каждый месяц остаётся около {_money(avg_net)}. "
                    f"Без явной цели деньги часто «растворяются» в повседневных тратах. "
                    f"Создайте цель «Подушка», «Отпуск» или «Крупная покупка» "
                    f"и переводите остаток сразу после зарплаты."
                ),
                "action": "Откройте блок «Цели» в кошельке",
            })

    if recurring_income and avg_net >= 3000:
        salary = max(recurring_income, key=lambda item: item["amount"])
        save_amount = min(avg_net * 0.2, salary["amount"] * 0.15)
        day = salary.get("typical_day", 1)

        messages.append({
            "id": "payday_save_habit",
            "type": "payday_habit",
            "priority": "low",
            "title": "Привычка: откладывать в день зарплаты",
            "message": (
                f"Похоже, доход ~{_money(salary['amount'])} приходит "
                f"около {day}-го числа. После поступления переведите "
                f"~{_money(save_amount)} на накопления - так проще не потратить "
                f"остаток до конца месяца."
            ),
            "action": "Настройте напоминание или пополнение цели на этот день",
        })

    return messages


def emergency_buffer_recommendation(
    snapshots: list[dict],
    avg_daily_expense: float,
    projected_balance: float,
) -> dict | None:
    if not snapshots or avg_daily_expense <= 0:
        return None

    full_months = [item for item in snapshots if not item["is_partial"]]
    if len(full_months) < 2:
        return None

    profitable = [item for item in full_months if item["net"] > 0]
    if len(profitable) < 2:
        return None

    monthly_expense = sum(item["expense"] for item in full_months[:2]) / min(
        len(full_months[:2]), 2
    )
    buffer_target = monthly_expense * 2

    if projected_balance >= buffer_target:
        return None

    avg_surplus = sum(item["net"] for item in profitable[:2]) / len(profitable[:2])
    months_to_buffer = max(
        (buffer_target - projected_balance) / max(avg_surplus, 1),
        1,
    )

    return {
        "id": "emergency_buffer",
        "type": "emergency_fund",
        "priority": "medium",
        "title": "Соберите финансовую подушку",
        "message": (
            f"Расходы стабильны (~{_money(monthly_expense)}/мес.), "
            f"а запас сейчас {_money(projected_balance)}. "
            f"Комфортная подушка - около {_money(buffer_target)} (2 месяца расходов). "
            f"При текущем остатке это достижимо за ~{months_to_buffer:.0f} мес."
        ),
        "action": "Создайте цель «Подушка безопасности» и пополняйте каждый месяц",
    }
