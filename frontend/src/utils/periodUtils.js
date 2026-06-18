const MS_DAY = 86400000;

export const DEFAULT_PERIOD = "all";

export const BALANCE_PERIOD_OPTIONS = [
  { id: "all", label: "Всё время" },
  { id: "week", label: "Неделя" },
  { id: "month", label: "Месяц" },
  { id: "custom", label: "Другой" },
];

export const TREND_PERIOD_OPTIONS = [
  { id: "all", label: "Всё время" },
  { id: "7", label: "7 дней" },
  { id: "14", label: "14 дней" },
  { id: "30", label: "30 дней" },
  { id: "custom", label: "Другой" },
];

export const CHART_PERIOD_OPTIONS = [
  { id: "all", label: "Всё" },
  { id: "day", label: "День" },
  { id: "week", label: "Неделя" },
  { id: "month", label: "Месяц" },
  { id: "custom", label: "Другой" },
];

/** @deprecated use BALANCE_PERIOD_OPTIONS */
export const BALANCE_PERIODS = BALANCE_PERIOD_OPTIONS;

export function createPeriodState(preset = DEFAULT_PERIOD) {
  return { preset, from: null, to: null };
}

function parseDate(transaction) {
  return new Date(transaction.transaction_date);
}

export function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(value) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function toInputDate(value) {
  if (!value) return "";
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatPeriodHint(periodState) {
  const { preset, from, to } = periodState;

  if (preset === "custom" && from && to) {
    const start = startOfDay(from).toLocaleDateString("ru-RU");
    const end = startOfDay(to).toLocaleDateString("ru-RU");
    return `${start} - ${end}`;
  }

  const labels = {
    all: "за всё время",
    week: "за 7 дней",
    month: "за текущий месяц",
    day: "за сутки",
    "7": "за 7 дней",
    "14": "за 14 дней",
    "30": "за 30 дней",
  };

  return labels[preset] || "за выбранный период";
}

export function filterByDateRange(transactions, from, to) {
  if (!transactions?.length || !from || !to) {
    return transactions ?? [];
  }

  const start = startOfDay(from);
  const end = endOfDay(to);

  return transactions.filter((transaction) => {
    const date = parseDate(transaction);
    return date >= start && date <= end;
  });
}

export function filterTransactionsByPeriod(
  transactions,
  periodState
) {
  if (!transactions?.length) {
    return transactions ?? [];
  }

  const preset =
    typeof periodState === "string"
      ? periodState
      : periodState?.preset ?? DEFAULT_PERIOD;

  const range =
    typeof periodState === "object" ? periodState : null;

  if (preset === "all") {
    return transactions;
  }

  if (preset === "custom") {
    return filterByDateRange(
      transactions,
      range?.from,
      range?.to
    );
  }

  const now = new Date();

  if (preset === "month") {
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );
    start.setHours(0, 0, 0, 0);
    return transactions.filter(
      (transaction) => parseDate(transaction) >= start
    );
  }

  if (preset === "week") {
    const cutoff = Date.now() - 7 * MS_DAY;
    return transactions.filter(
      (transaction) => parseDate(transaction).getTime() >= cutoff
    );
  }

  if (preset === "day") {
    const cutoff = Date.now() - MS_DAY;
    return transactions.filter(
      (transaction) => parseDate(transaction).getTime() >= cutoff
    );
  }

  return transactions;
}

export function getTotalsForPeriod(transactions, periodState) {
  const filtered = filterTransactionsByPeriod(
    transactions,
    periodState
  );

  const income = filtered
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const expense = filtered
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    income,
    expense,
    balance: income - expense,
    count: filtered.length,
    savingsRate:
      income > 0 ? ((income - expense) / income) * 100 : 0,
  };
}

function sumByDay(transactions, date) {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);

  const dayTransactions = transactions.filter((transaction) => {
    const txDate = parseDate(transaction);
    return txDate >= date && txDate < next;
  });

  const income = dayTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const expense = dayTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return { income, expense, net: income - expense };
}

function buildDailySeries(transactions, fromDate, toDate) {
  const result = [];
  const cursor = startOfDay(fromDate);
  const end = startOfDay(toDate);

  while (cursor <= end) {
    const totals = sumByDay(transactions, cursor);
    result.push({
      label: cursor.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "short",
      }),
      ...totals,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

function buildWeeklySeries(transactions, fromDate, toDate) {
  const result = [];
  const cursor = startOfDay(fromDate);
  const end = startOfDay(toDate);

  while (cursor <= end) {
    const weekEnd = new Date(cursor);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (weekEnd > end) {
      weekEnd.setTime(end.getTime());
    }

    const slice = filterByDateRange(
      transactions,
      cursor,
      weekEnd
    );

    const income = slice
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const expense = slice
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    result.push({
      label: `${cursor.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "short",
      })}`,
      income,
      expense,
      net: income - expense,
    });

    cursor.setDate(cursor.getDate() + 7);
  }

  return result;
}

function buildMonthlySeries(transactions, fromDate, toDate) {
  const result = [];
  const cursor = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    1
  );
  const end = startOfDay(toDate);

  while (cursor <= end) {
    const monthEnd = new Date(
      cursor.getFullYear(),
      cursor.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );
    const slice = filterByDateRange(
      transactions,
      cursor,
      monthEnd > end ? end : monthEnd
    );

    const income = slice
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const expense = slice
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    result.push({
      label: cursor.toLocaleDateString("ru-RU", {
        month: "short",
        year: "2-digit",
      }),
      income,
      expense,
      net: income - expense,
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return result;
}

export function getTrendChartData(transactions, periodState) {
  if (!transactions?.length) {
    return [];
  }

  const preset = periodState?.preset ?? DEFAULT_PERIOD;

  if (preset === "7" || preset === "14" || preset === "30") {
    const days = Number(preset);
    const result = [];

    for (let index = days - 1; index >= 0; index -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - index);
      const totals = sumByDay(transactions, date);
      result.push({
        label: date.toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "short",
        }),
        ...totals,
      });
    }

    return result;
  }

  let filtered = filterTransactionsByPeriod(
    transactions,
    periodState
  );

  if (!filtered.length) {
    return [];
  }

  const dates = filtered.map((transaction) =>
    startOfDay(parseDate(transaction))
  );
  const fromDate = new Date(Math.min(...dates));
  const toDate = new Date(Math.max(...dates));
  const spanDays =
    Math.round((toDate - fromDate) / MS_DAY) + 1;

  if (spanDays <= 31) {
    return buildDailySeries(filtered, fromDate, toDate);
  }

  if (spanDays <= 120) {
    return buildWeeklySeries(filtered, fromDate, toDate);
  }

  return buildMonthlySeries(filtered, fromDate, toDate);
}

export function buildAnalyticsQuery(periodState) {
  const preset = periodState?.preset ?? DEFAULT_PERIOD;

  if (preset === "custom" && periodState.from && periodState.to) {
    return {
      date_from: toInputDate(periodState.from),
      date_to: toInputDate(periodState.to),
    };
  }

  return { period: preset };
}
