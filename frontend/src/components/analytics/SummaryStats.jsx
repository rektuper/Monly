import {
  FiTrendingUp,
  FiTrendingDown,
  FiActivity,
  FiPercent,
} from "react-icons/fi";

import {
  getTotals,
  getAverageDailyExpense,
  formatMoney,
} from "../../utils/transactionAnalytics";

import "../../styles/analytics/SummaryStats.css";

function SummaryStats({ transactions }) {
  const monthTotals = getTotals(transactions, 30);
  const allTotals = getTotals(transactions);
  const avgDaily = getAverageDailyExpense(transactions, 30);

  const cards = [
    {
      label: "Доход за месяц",
      value: `${formatMoney(monthTotals.income)} ₽`,
      icon: FiTrendingUp,
      tone: "positive",
    },
    {
      label: "Расход за месяц",
      value: `${formatMoney(monthTotals.expense)} ₽`,
      icon: FiTrendingDown,
      tone: "negative",
    },
    {
      label: "Средний расход / день",
      value: `${formatMoney(avgDaily)} ₽`,
      icon: FiActivity,
      tone: "neutral",
    },
    {
      label: "Накопления",
      value: `${monthTotals.savingsRate.toFixed(1)}%`,
      sub: `${allTotals.count} операций`,
      icon: FiPercent,
      tone: monthTotals.savingsRate >= 0 ? "positive" : "negative",
    },
  ];

  return (
    <div className="summary-stats-grid">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className={`summary-stat-card ${card.tone}`}
          >
            <div className="summary-stat-icon">
              <Icon />
            </div>
            <div className="summary-stat-content">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              {card.sub && <p>{card.sub}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default SummaryStats;
