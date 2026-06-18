import { useMemo, useState } from "react";
import { FiActivity } from "react-icons/fi";

import FeaturedSectionHeader from "../shared/FeaturedSectionHeader";
import PeriodFilter from "../shared/PeriodFilter";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import {
  createPeriodState,
  getTrendChartData,
  TREND_PERIOD_OPTIONS,
} from "../../utils/periodUtils";

import "../../styles/analytics/AnalyticsCard.css";
import "../../styles/analytics/IncomeExpenseTrend.css";

function IncomeExpenseTrend({ transactions }) {
  const [period, setPeriod] = useState(() =>
    createPeriodState("all")
  );

  const data = useMemo(
    () => getTrendChartData(transactions, period),
    [transactions, period]
  );

  const hasData = data.some(
    (item) => item.income > 0 || item.expense > 0
  );

  return (
    <section className="analytics-card income-expense-trend">
      <FeaturedSectionHeader
        icon={FiActivity}
        title="Динамика доходов и расходов"
        subtitle="Ежедневное сравнение за выбранный период"
      >
        <PeriodFilter
          value={period}
          onChange={setPeriod}
          options={TREND_PERIOD_OPTIONS}
          ariaLabel="Период графика"
        />
      </FeaturedSectionHeader>

      {!hasData ? (
        <p className="analytics-empty">
          Недостаточно данных для графика
        </p>
      ) : (
        <div className="trend-chart-wrapper">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={data}
              barGap={4}
              barCategoryGap="16%"
              margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
            >
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 12 }} width={60} />
              <Tooltip
                formatter={(value) =>
                  `${Number(value).toFixed(2)} ₽`
                }
              />
              <Legend />
              <Bar
                dataKey="income"
                name="Доход"
                fill="var(--chart-income)"
                radius={[6, 6, 0, 0]}
                maxBarSize={36}
              />
              <Bar
                dataKey="expense"
                name="Расход"
                fill="var(--chart-expense)"
                radius={[6, 6, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export default IncomeExpenseTrend;
