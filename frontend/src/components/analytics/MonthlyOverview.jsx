import {
  FiArrowUp,
  FiArrowDown,
  FiCalendar,
} from "react-icons/fi";

import FeaturedSectionHeader from "../shared/FeaturedSectionHeader";

import {
  getMonthlyComparison,
  formatMoney,
} from "../../utils/transactionAnalytics";

import "../../styles/analytics/AnalyticsCard.css";
import "../../styles/analytics/MonthlyOverview.css";

function MonthlyOverview({ transactions }) {
  const {
    thisMonth,
    lastMonth,
    expenseChange,
  } = getMonthlyComparison(transactions);

  const isUp = expenseChange > 0;

  return (
    <section className="analytics-card monthly-overview">
      <FeaturedSectionHeader
        icon={FiCalendar}
        title="Сравнение месяцев"
        subtitle="Текущий месяц vs прошлый"
      />

      <div className="monthly-overview-grid">
        <div className="month-card current">
          <span>Этот месяц</span>
          <strong>
            {formatMoney(thisMonth.expense)} ₽
          </strong>
          <p>расходы</p>
          <small>
            доход: {formatMoney(thisMonth.income)} ₽
          </small>
        </div>

        <div className="month-card previous">
          <span>Прошлый месяц</span>
          <strong>
            {formatMoney(lastMonth.expense)} ₽
          </strong>
          <p>расходы</p>
          <small>
            доход: {formatMoney(lastMonth.income)} ₽
          </small>
        </div>

        <div
          className={`month-change ${isUp ? "up" : "down"}`}
        >
          <div className="month-change-icon">
            {isUp ? <FiArrowUp /> : <FiArrowDown />}
          </div>
          <span>Изменение расходов</span>
          <strong>
            {expenseChange > 0 ? "+" : ""}
            {expenseChange.toFixed(1)}%
          </strong>
        </div>
      </div>
    </section>
  );
}

export default MonthlyOverview;
