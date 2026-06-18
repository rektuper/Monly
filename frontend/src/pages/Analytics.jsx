import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";

import api from "../api/api";

import Sidebar from "../components/layout/Sidebar";
import PageHeader from "../components/layout/PageHeader";
import SummaryStats from "../components/analytics/SummaryStats";
import IncomeExpenseTrend from "../components/analytics/IncomeExpenseTrend";
import CategoryBarChart from "../components/analytics/CategoryBarChart";
import TopExpensesList from "../components/analytics/TopExpensesList";
import MonthlyOverview from "../components/analytics/MonthlyOverview";
import WeekdaySpending from "../components/analytics/WeekdaySpending";

import "../styles/pages/Analytics.css";

const ExpenseChart = lazy(
  () => import("../components/wallet/ExpenseChart")
);

function Analytics() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await api.get("/transactions");
      setTransactions(response.data);
    } catch (_) {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-content app-page-panel">
        <PageHeader
          title="Аналитика"
          subtitle="Обзор ваших финансов на основе транзакций"
        />

        {loading ? (
          <p className="analytics-loading">Загрузка данных...</p>
        ) : (
          <div className="analytics-grid">
            <SummaryStats transactions={transactions} />

            <IncomeExpenseTrend transactions={transactions} />

            <div className="analytics-row two-cols">
              <Suspense
                fallback={
                  <div className="dashboard-widget-fallback" />
                }
              >
                <ExpenseChart />
              </Suspense>
              <CategoryBarChart transactions={transactions} />
            </div>

            <div className="analytics-row two-cols">
              <MonthlyOverview transactions={transactions} />
              <WeekdaySpending transactions={transactions} />
            </div>

            <TopExpensesList transactions={transactions} />
          </div>
        )}
      </main>
    </div>
  );
}

export default Analytics;
