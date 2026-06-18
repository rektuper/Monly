import { FiTrendingDown } from "react-icons/fi";

import FeaturedSectionHeader from "../shared/FeaturedSectionHeader";
import {
  getTopTransactions,
  formatMoney,
} from "../../utils/transactionAnalytics";

import "../../styles/analytics/AnalyticsCard.css";
import "../../styles/analytics/TopExpensesList.css";

function TopExpensesList({ transactions }) {
  const topExpenses = getTopTransactions(
    transactions,
    5,
    "expense"
  );

  return (
    <section className="analytics-card top-expenses-list">
      <FeaturedSectionHeader
        icon={FiTrendingDown}
        title="Крупнейшие траты"
        subtitle="Топ-5 расходных операций"
      />

      {topExpenses.length === 0 ? (
        <p className="analytics-empty">
          Расходных операций пока нет
        </p>
      ) : (
        <div className="top-expenses-items">
          {topExpenses.map((item, index) => (
            <div
              key={item.id}
              className="top-expense-item"
            >
              <div className="top-expense-rank">
                {index + 1}
              </div>
              <div className="top-expense-info">
                <strong>
                  {item.category?.name || "Без категории"}
                </strong>
                <span>
                  {item.description || "Без описания"}
                </span>
                <small>
                  {new Date(
                    item.transaction_date
                  ).toLocaleDateString("ru-RU")}
                </small>
              </div>
              <div className="top-expense-amount">
                -{formatMoney(item.amount)} ₽
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default TopExpensesList;
