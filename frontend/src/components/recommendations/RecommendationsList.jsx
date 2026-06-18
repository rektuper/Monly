import {
  FiAlertCircle,
  FiTrendingUp,
  FiTarget,
  FiInfo,
  FiTrendingDown,
  FiDollarSign,
  FiCalendar,
  FiZap,
} from "react-icons/fi";

import FeaturedSectionHeader from "../shared/FeaturedSectionHeader";

import "../../styles/recommendations/RecommendationsList.css";

const ICONS = {
  overspend: FiAlertCircle,
  trend_up: FiTrendingUp,
  goal_risk: FiTarget,
  goal_boost: FiTarget,
  create_goal: FiTarget,
  save_opportunity: FiDollarSign,
  emergency_fund: FiTarget,
  payday_habit: FiCalendar,
  income_up: FiTrendingUp,
  expense_down: FiTrendingDown,
  micro_spending: FiAlertCircle,
  review: FiAlertCircle,
  concentration: FiTrendingUp,
  deficit_recovery: FiAlertCircle,
  forecast: FiTrendingUp,
  uneven_split: FiAlertCircle,
  savings_rate: FiInfo,
  anomaly: FiAlertCircle,
  weekday_pattern: FiCalendar,
  info: FiInfo,
};

function RecommendationsList({ recommendations }) {
  if (!recommendations?.length) {
    return (
      <section className="recommendations-card">
        <FeaturedSectionHeader
          icon={FiZap}
          title="Рекомендации"
          subtitle="Персональные советы по вашему бюджету"
        />
        <p className="recommendations-empty">
          Пока нет выводов - добавьте операции за несколько недель,
          чтобы система увидела тренды.
        </p>
      </section>
    );
  }

  return (
    <section className="recommendations-card">
      <FeaturedSectionHeader
        icon={FiZap}
        title="Рекомендации"
        subtitle="Персональные советы по вашему бюджету"
      />

      <div className="recommendations-items">
        {recommendations.map((item) => {
          const Icon = ICONS[item.type] || FiInfo;

          return (
            <article
              key={item.id}
              className={`recommendation-item priority-${item.priority} type-${item.type}`}
            >
              <div className="recommendation-icon">
                <Icon />
              </div>

              <div className="recommendation-content">
                <h3>{item.title}</h3>
                <p>{item.message}</p>
                {item.action && (
                  <span className="recommendation-action">
                    {item.action}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default RecommendationsList;
