const MS_DAY = 86400000;

export {
  BALANCE_PERIODS,
  BALANCE_PERIOD_OPTIONS,
  TREND_PERIOD_OPTIONS,
  CHART_PERIOD_OPTIONS,
  DEFAULT_PERIOD,
  createPeriodState,
  filterTransactionsByPeriod,
  filterByDateRange,
  getTotalsForPeriod,
  getTrendChartData,
  buildAnalyticsQuery,
  formatPeriodHint,
  toInputDate,
} from "./periodUtils";

export function formatMoney(value) {
  return Number(value).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseDate(transaction) {
  return new Date(transaction.transaction_date);
}

function isWithinDays(date, days) {
  const cutoff = Date.now() - days * MS_DAY;
  return date.getTime() >= cutoff;
}

export function getTotals(transactions, days = null) {
  const filtered = days
    ? transactions.filter((t) =>
        isWithinDays(parseDate(t), days)
      )
    : transactions;

  const income = filtered
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const expense = filtered
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    income,
    expense,
    balance: income - expense,
    count: filtered.length,
    savingsRate:
      income > 0
        ? ((income - expense) / income) * 100
        : 0,
  };
}

export function getDailyTrend(transactions, days = 14) {
  const result = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);

    const next = new Date(date);
    next.setDate(next.getDate() + 1);

    const dayTransactions = transactions.filter((t) => {
      const txDate = parseDate(t);
      return txDate >= date && txDate < next;
    });

    const income = dayTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = dayTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    result.push({
      label: date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "short",
      }),
      income,
      expense,
      net: income - expense,
    });
  }

  return result;
}

export function getCategoryTotals(
  transactions,
  type = "expense",
  days = null
) {
  const filtered = transactions.filter((t) => {
    if (t.type !== type) return false;
    if (days && !isWithinDays(parseDate(t), days)) {
      return false;
    }
    return true;
  });

  const map = {};

  filtered.forEach((t) => {
    const name = t.category?.name || "Без категории";
    map[name] = (map[name] || 0) + t.amount;
  });

  return Object.entries(map)
    .map(([category, total]) => ({
      category,
      total,
    }))
    .sort((a, b) => b.total - a.total);
}

export function getTopTransactions(
  transactions,
  limit = 5,
  type = "expense"
) {
  return transactions
    .filter((t) => t.type === type)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

export function getMonthlyComparison(transactions) {
  const now = new Date();

  const thisMonthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const lastMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  );

  const calc = (start, end) => {
    const slice = transactions.filter((t) => {
      const date = parseDate(t);
      return date >= start && date < end;
    });

    const income = slice
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = slice
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    return { income, expense, balance: income - expense };
  };

  const thisMonth = calc(thisMonthStart, now);
  const lastMonth = calc(
    lastMonthStart,
    thisMonthStart
  );

  const expenseChange =
    lastMonth.expense > 0
      ? ((thisMonth.expense - lastMonth.expense) /
          lastMonth.expense) *
        100
      : 0;

  return {
    thisMonth,
    lastMonth,
    expenseChange,
  };
}

const WEEKDAYS = [
  "Вс",
  "Пн",
  "Вт",
  "Ср",
  "Чт",
  "Пт",
  "Сб",
];

export function getWeekdaySpending(transactions) {
  const totals = Array(7).fill(0);

  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const day = parseDate(t).getDay();
      totals[day] += t.amount;
    });

  return WEEKDAYS.map((label, index) => ({
    label,
    total: totals[index],
  }));
}

export function getAverageDailyExpense(
  transactions,
  days = 30
) {
  const { expense } = getTotals(
    transactions,
    days
  );

  return expense / days;
}
