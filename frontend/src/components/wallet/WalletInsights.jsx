import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiZap,
  FiArrowRight,
  FiAlertCircle,
  FiTrendingUp,
  FiTarget,
  FiInfo,
  FiTrendingDown,
  FiDollarSign,
  FiCalendar,
} from "react-icons/fi";

import api from "../../api/api";
import FeaturedSectionHeader from "../shared/FeaturedSectionHeader";
import { filterUserRecommendations } from "../../utils/userRecommendations";

import "../../styles/wallet/WalletInsights.css";

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
  concentration: FiTrendingUp,
  deficit_recovery: FiAlertCircle,
  forecast: FiTrendingUp,
  uneven_split: FiAlertCircle,
  savings_rate: FiInfo,
  anomaly: FiAlertCircle,
  weekday_pattern: FiCalendar,
  info: FiInfo,
};

function WalletInsights({ refreshKey = 0 }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [forecast, setForecast] = useState(null);

  const fetchInsights = useCallback(async () => {
    try {
      const recRes = await api.get("/recommendations");
      setItems(filterUserRecommendations(recRes.data).slice(0, 2));
    } catch (_) {
      setItems([]);
    }

    try {
      const forecastRes = await api.get("/recommendations/forecast");
      setForecast(forecastRes.data);
    } catch (_) {
      setForecast(null);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights, refreshKey]);

  const forecastValue = useMemo(() => {
    if (!forecast) return null;
    return forecast.projected_balance_month_end
      ?? forecast.projected_balance_30d;
  }, [forecast]);

  const forecastAmount = useMemo(() => {
    if (forecastValue === null) return null;

    const symbol =
      forecast.currency === "EUR"
        ? "€"
        : forecast.currency === "USD"
          ? "$"
          : "₽";

    return `${forecastValue.toLocaleString("ru-RU")} ${symbol}`;
  }, [forecast, forecastValue]);

  const forecastTone =
    forecastValue !== null && forecastValue < 0 ? "negative" : "positive";

  return (
    <section className="wallet-insights">
      <FeaturedSectionHeader
        icon={FiZap}
        title="Советы"
        subtitle="Персонально по вашим операциям"
      >
        <button
          type="button"
          className="featured-card-action"
          onClick={() => navigate("/recommendations")}
        >
          Все советы
          <FiArrowRight />
        </button>
      </FeaturedSectionHeader>

      <div className="wallet-insights-body">
        {forecast && (
          <div className={`wallet-insights-forecast wallet-insights-forecast--${forecastTone}`}>
            <span className="wallet-insights-forecast-label">
              {forecast.is_family ? "Семейный прогноз" : "Прогноз"} к концу месяца
            </span>
            <strong>{forecastAmount}</strong>
            {forecast.summary && (
              <p className="wallet-insights-forecast-note">
                {forecast.summary}
              </p>
            )}
          </div>
        )}

        {items.length === 0 ? (
          <p className="wallet-insights-empty">
            Добавьте операции - появятся персональные советы
          </p>
        ) : (
          <ul className="wallet-insights-list">
            {items.map((item) => {
              const Icon = ICONS[item.type] || FiInfo;

              return (
                <li
                  key={item.id}
                  className={`wallet-insight-item priority-${item.priority} type-${item.type}`}
                >
                  <span className="wallet-insight-icon" aria-hidden>
                    <Icon />
                  </span>
                  <div className="wallet-insight-content">
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

export default memo(WalletInsights);
