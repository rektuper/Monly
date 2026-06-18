import {
    memo,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

import { FiPieChart } from "react-icons/fi";

import FeaturedSectionHeader from "../shared/FeaturedSectionHeader";
import PeriodFilter from "../shared/PeriodFilter";
import api from "../../api/api";
import {
    buildAnalyticsQuery,
    CHART_PERIOD_OPTIONS,
    createPeriodState,
} from "../../utils/periodUtils";

import "../../styles/wallet/ExpenseChart.css";

const COLORS = [
    "#8ea7ff",
    "#7dd3fc",
    "#86efac",
    "#f9a8d4",
    "#fcd34d",
    "#c4b5fd",
    "#fb923c",
];

function ChartTooltip({ active, payload }) {
    if (!active || !payload?.length) {
        return null;
    }

    const item = payload[0];

    return (
        <div className="chart-tooltip">
            <strong>{item.name}</strong>
            <span>{Number(item.value).toFixed(2)} ₽</span>
        </div>
    );
}

function ExpenseChart() {

    const [data, setData] =
        useState([]);

    const [period, setPeriod] = useState(() =>
        createPeriodState("all")
    );

    const [activeIndex, setActiveIndex] =
        useState(null);

    const [chartHeight, setChartHeight] = useState(280);

    useEffect(() => {
        const updateChartHeight = () => {
            setChartHeight(window.innerWidth <= 480 ? 260 : 280);
        };

        updateChartHeight();
        window.addEventListener("resize", updateChartHeight);
        return () => window.removeEventListener("resize", updateChartHeight);
    }, []);

    useEffect(() => {

        fetchAnalytics();

    }, [period]);

    const fetchAnalytics =
        async () => {

            try {

                const params = buildAnalyticsQuery(period);

                const response =
                    await api.get(
                        "/analytics/categories",
                        { params }
                    );

                setData(
                    response.data
                );

            } catch (_) { }

        };

    const total = useMemo(
        () =>
            data.reduce(
                (sum, item) =>
                    sum + item.total,
                0
            ),
        [data]
    );

    return (

        <div className="chart-block">

            <FeaturedSectionHeader
                icon={FiPieChart}
                title="Расходы"
                subtitle="Структура по категориям"
                className="featured-card-header--wrap"
            >
                <PeriodFilter
                    value={period}
                    onChange={setPeriod}
                    options={CHART_PERIOD_OPTIONS}
                    ariaLabel="Период расходов"
                    className="period-filter--chart"
                />

            </FeaturedSectionHeader>

            <div className="chart-content">

                {data.length === 0 ? (
                    <p className="chart-empty">
                        Нет расходов за выбранный период
                    </p>
                ) : (
                <>
                <div
                    className="chart-wrapper"
                    style={{ minHeight: chartHeight }}
                >

                    <ResponsiveContainer
                        width="100%"
                        height={chartHeight}
                    >

                        <PieChart
                            margin={{
                                top: 12,
                                right: 12,
                                bottom: 12,
                                left: 12,
                            }}
                        >

                            <Pie
                                data={data}
                                dataKey="total"
                                nameKey="category"
                                cx="50%"
                                cy="50%"
                                innerRadius="58%"
                                outerRadius="82%"
                                paddingAngle={3}
                                activeIndex={activeIndex}
                                isAnimationActive={false}
                                stroke="none"
                                onMouseEnter={(_, index) =>
                                    setActiveIndex(index)
                                }
                                onMouseLeave={() =>
                                    setActiveIndex(null)
                                }
                            >

                                {data.map(
                                    (_, index) => (

                                        <Cell
                                            key={index}
                                            fill={
                                                COLORS[
                                                index %
                                                COLORS.length
                                                ]
                                            }

                                            opacity={
                                                activeIndex === null
                                                    || activeIndex === index
                                                    ? 1
                                                    : 0.35
                                            }
                                        />

                                    ))}

                            </Pie>

                            <Tooltip
                                content={<ChartTooltip />}
                                cursor={false}
                                wrapperStyle={{ outline: "none" }}
                            />

                        </PieChart>

                    </ResponsiveContainer>

                </div>

                <div className="chart-legend">

                    {data.map(
                        (item, index) => (

                            <div
                                key={index}

                                className={
                                    activeIndex === index
                                        ? "legend-item active-legend"
                                        : "legend-item"
                                }

                                onMouseEnter={() =>
                                    setActiveIndex(index)
                                }

                                onMouseLeave={() =>
                                    setActiveIndex(null)
                                }

                                onClick={() =>
                                    setActiveIndex(
                                        activeIndex === index
                                            ? null
                                            : index
                                    )
                                }
                            >

                                <div className="legend-left">

                                    <div
                                        className="legend-color"

                                        style={{
                                            background:
                                                COLORS[
                                                index %
                                                COLORS.length
                                                ],
                                        }}
                                    />

                                    <span>
                                        {item.category}
                                    </span>

                                </div>

                                <div className="legend-right">

                                    <strong>
                                        {item.total.toFixed(2)} ₽
                                    </strong>

                                    {total > 0 && (
                                        <small>
                                            {((item.total / total) * 100).toFixed(0)}%
                                        </small>
                                    )}

                                </div>

                            </div>

                        ))}

                </div>
                </>
                )}

            </div>

        </div>

    );
}

export default memo(ExpenseChart);
