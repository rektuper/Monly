import { FiClock } from "react-icons/fi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import FeaturedSectionHeader from "../shared/FeaturedSectionHeader";

import {
  getWeekdaySpending,
  formatMoney,
} from "../../utils/transactionAnalytics";

import "../../styles/analytics/AnalyticsCard.css";
import "../../styles/analytics/WeekdaySpending.css";

function WeekdaySpending({ transactions }) {
  const data = getWeekdaySpending(transactions);
  const hasData = data.some((item) => item.total > 0);

  return (
    <section className="analytics-card weekday-spending">
      <FeaturedSectionHeader
        icon={FiClock}
        title="Расходы по дням недели"
        subtitle="Когда вы тратите больше всего"
      />

      {!hasData ? (
        <p className="analytics-empty">
          Недостаточно данных
        </p>
      ) : (
        <div className="weekday-chart-wrapper">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data}>
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} width={50} />
              <Tooltip
                formatter={(value) =>
                  `${formatMoney(value)} ₽`
                }
              />
              <Bar
                dataKey="total"
                name="Расход"
                fill="#8ea7ff"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export default WeekdaySpending;
