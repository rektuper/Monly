import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/api";

import Sidebar from "../components/layout/Sidebar";
import PageHeader from "../components/layout/PageHeader";
import RecommendationsList from "../components/recommendations/RecommendationsList";
import ForecastCard from "../components/recommendations/ForecastCard";
import DashboardEmptyState from "../components/dashboard/DashboardEmptyState";

import "../styles/pages/Dashboard.css";

const AddTransactionModal = lazy(
  () => import("../components/wallet/AddTransactionModal")
);

const ImportStatementModal = lazy(
  () => import("../components/wallet/ImportStatementModal")
);

function Dashboard() {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [hasTransactions, setHasTransactions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const txRes = await api.get("/transactions");
      const transactions = txRes.data || [];
      setHasTransactions(transactions.length > 0);

      try {
        const recRes = await api.get("/recommendations");
        setRecommendations(recRes.data.slice(0, 3));
      } catch (_) {
        setRecommendations([]);
      }

      try {
        const forecastRes = await api.get("/recommendations/forecast");
        setForecast(forecastRes.data);
      } catch (_) {
        setForecast(null);
      }
    } catch (_) {
      setHasTransactions(false);
      setRecommendations([]);
      setForecast(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTransactionAdded = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-content app-page-panel">
        <PageHeader
          title="Добро пожаловать"
          subtitle={
            hasTransactions
              ? "Краткий обзор прогноза и рекомендаций"
              : "Начните с добавления операций в кошелёк"
          }
        />

        {loading ? (
          <p className="dashboard-loading">Загружаем данные...</p>
        ) : !hasTransactions ? (
          <DashboardEmptyState
            onAddTransaction={() => setIsAddModalOpen(true)}
            onImportStatement={() => setIsImportModalOpen(true)}
          />
        ) : (
          <section className="dashboard-widgets">
            <ForecastCard forecast={forecast} />
            <RecommendationsList recommendations={recommendations} />
            <div className="dashboard-more-link">
              <button
                type="button"
                onClick={() => navigate("/recommendations")}
              >
                Все рекомендации и цели →
              </button>
            </div>
          </section>
        )}
      </main>

      {isAddModalOpen && (
        <Suspense fallback={null}>
          <AddTransactionModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onTransactionAdded={handleTransactionAdded}
          />
        </Suspense>
      )}

      {isImportModalOpen && (
        <Suspense fallback={null}>
          <ImportStatementModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            onTransactionsImported={handleTransactionAdded}
          />
        </Suspense>
      )}
    </div>
  );
}

export default Dashboard;
