import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiPieChart } from "react-icons/fi";

import FeaturedSectionHeader from "../shared/FeaturedSectionHeader";
import {
  getCategoryTotals,
  formatMoney,
} from "../../utils/transactionAnalytics";

import "../../styles/wallet/TopCategoriesWidget.css";

const COLORS = ["#8ea7ff", "#7dd3fc", "#86efac", "#f9a8d4"];

function TopCategoriesWidget({ transactions }) {
  const navigate = useNavigate();
  const top = useMemo(() => {
    const categories = getCategoryTotals(
      transactions,
      "expense"
    );
    return categories.slice(0, 4);
  }, [transactions]);
  const maxTotal = top[0]?.total || 1;

  return (
    <section className="top-categories-widget">
      <FeaturedSectionHeader
        icon={FiPieChart}
        title="Куда уходят деньги"
        subtitle="Топ категорий по расходам"
      >
        <button
          type="button"
          className="featured-card-action featured-card-action--soft"
          onClick={() => navigate("/analytics")}
        >
          <FiPieChart />
          Аналитика
        </button>
      </FeaturedSectionHeader>

      {top.length === 0 ? (
        <div className="top-categories-body">
          <p className="top-categories-empty">
            Нет расходов
          </p>
        </div>
      ) : (
        <div className="top-categories-body">
          <ul className="top-categories-list">
            {top.map((item, index) => {
              const width = (item.total / maxTotal) * 100;

              return (
                <li key={item.category}>
                  <div className="top-category-meta">
                    <span>{item.category}</span>
                    <strong>{formatMoney(item.total)} ₽</strong>
                  </div>
                  <div className="top-category-track">
                    <div
                      className="top-category-fill"
                      style={{
                        width: `${width}%`,
                        background: COLORS[index % COLORS.length],
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

export default memo(TopCategoriesWidget);
