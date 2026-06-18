import { FiTrendingUp } from "react-icons/fi";

import FeaturedSectionHeader from "../shared/FeaturedSectionHeader";
import { formatCurrency } from "../../utils/currency";

import "../../styles/recommendations/ForecastCard.css";

const TREND_LABELS = {
  up: "растут",
  down: "снижаются",
  stable: "стабильны",
};

const CONFIDENCE_LABELS = {
  high: "Высокая точность",
  medium: "Средняя точность",
  low: "Предварительный прогноз",
};

function ForecastCard({ forecast }) {
  if (!forecast) {
    return null;
  }

  const currency = forecast.currency || "RUB";

  return (
    <section className="forecast-card">
      <FeaturedSectionHeader
        icon={FiTrendingUp}
        title="Умный прогноз"
        subtitle="На основе ваших доходов и расходов"
      >
        <span className={`forecast-confidence confidence-${forecast.confidence || "low"}`}>
          {CONFIDENCE_LABELS[forecast.confidence] || CONFIDENCE_LABELS.low}
        </span>
      </FeaturedSectionHeader>

      {forecast.summary && (
        <p className="forecast-summary">{forecast.summary}</p>
      )}

      <div className="forecast-grid">
        <div className="forecast-item">
          <span>Текущий баланс</span>
          <strong>
            {formatCurrency(forecast.current_balance, currency)}
          </strong>
        </div>

        <div className="forecast-item">
          <span>Средний доход / день</span>
          <strong>
            {formatCurrency(forecast.avg_daily_income, currency)}
          </strong>
          {forecast.income_trend && (
            <small className={`forecast-trend trend-${forecast.income_trend}`}>
              {TREND_LABELS[forecast.income_trend]}
              {forecast.income_trend !== "stable" &&
                ` (${forecast.income_trend_percent > 0 ? "+" : ""}${forecast.income_trend_percent}%)`}
            </small>
          )}
        </div>

        <div className="forecast-item">
          <span>Средний расход / день</span>
          <strong>
            {formatCurrency(forecast.avg_daily_expense, currency)}
          </strong>
          {forecast.expense_trend && (
            <small className={`forecast-trend trend-${forecast.expense_trend}`}>
              {TREND_LABELS[forecast.expense_trend]}
              {forecast.expense_trend !== "stable" &&
                ` (${forecast.expense_trend_percent > 0 ? "+" : ""}${forecast.expense_trend_percent}%)`}
            </small>
          )}
        </div>

        <div className="forecast-item highlight">
          <span>К концу месяца</span>
          <strong>
            {formatCurrency(
              forecast.projected_balance_month_end,
              currency
            )}
          </strong>
        </div>

        <div className="forecast-item">
          <span>Через 30 дней</span>
          <strong>
            {formatCurrency(forecast.projected_balance_30d, currency)}
          </strong>
        </div>

        <div className="forecast-item">
          <span>Ожид. доход / расход за месяц</span>
          <strong className="forecast-monthly-pair">
            <span className="forecast-income">
              +{formatCurrency(forecast.expected_monthly_income, currency)}
            </span>
            <span className="forecast-expense">
              -{formatCurrency(forecast.expected_monthly_expense, currency)}
            </span>
          </strong>
        </div>
      </div>
    </section>
  );
}

export default ForecastCard;
