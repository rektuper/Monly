import { FiBarChart2 } from "react-icons/fi";

import FeaturedSectionHeader from "../shared/FeaturedSectionHeader";
import {
  getCategoryTotals,
  formatMoney,
} from "../../utils/transactionAnalytics";

import "../../styles/analytics/AnalyticsCard.css";
import "../../styles/analytics/CategoryBarChart.css";

const COLORS = [
  "#8ea7ff",
  "#7dd3fc",
  "#86efac",
  "#f9a8d4",
  "#fcd34d",
  "#c4b5fd",
  "#fb923c",
];

function CategoryBarChart({ transactions }) {
  const categories = getCategoryTotals(
    transactions,
    "expense"
  );

  const maxTotal = categories[0]?.total || 1;

  return (
    <section className="analytics-card category-bar-chart">
      <FeaturedSectionHeader
        icon={FiBarChart2}
        title="Структура расходов"
        subtitle="Топ категорий по расходам"
      />

      {categories.length === 0 ? (
        <p className="analytics-empty">
          Расходов пока нет
        </p>
      ) : (
        <div className="category-bars">
          {categories.map((item, index) => {
            const width =
              (item.total / maxTotal) * 100;

            return (
              <div
                key={item.category}
                className="category-bar-row"
              >
                <div className="category-bar-meta">
                  <span>{item.category}</span>
                  <strong>
                    {formatMoney(item.total)} ₽
                  </strong>
                </div>
                <div className="category-bar-track">
                  <div
                    className="category-bar-fill"
                    style={{
                      width: `${width}%`,
                      background:
                        COLORS[index % COLORS.length],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default CategoryBarChart;
