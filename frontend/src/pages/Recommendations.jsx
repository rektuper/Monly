import { useContext, useEffect, useState } from "react";

import api from "../api/api";
import { AuthContext } from "../context/AuthContext";
import { filterUserRecommendations } from "../utils/userRecommendations";

import Sidebar from "../components/layout/Sidebar";
import PageHeader from "../components/layout/PageHeader";
import RecommendationsList from "../components/recommendations/RecommendationsList";
import ForecastCard from "../components/recommendations/ForecastCard";

import "../styles/pages/Recommendations.css";

function Recommendations() {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === "admin";
  const [recommendations, setRecommendations] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    try {
      const recRes = await api.get("/recommendations");
      setRecommendations(
        filterUserRecommendations(recRes.data, isAdmin)
      );
    } catch (error) {
      console.error(error);
      setRecommendations([]);
    }

    try {
      const forecastRes = await api.get("/recommendations/forecast");
      setForecast(forecastRes.data);
    } catch (error) {
      console.error(error);
      setForecast(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-content app-page-panel">
        <PageHeader
          title="Рекомендации"
          subtitle="Персональные советы на основе ваших транзакций"
        />

        {loading ? (
          <p className="recommendations-loading">Анализируем финансы...</p>
        ) : (
          <div className="recommendations-grid">
            <ForecastCard forecast={forecast} />

            <RecommendationsList recommendations={recommendations} />
          </div>
        )}
      </main>
    </div>
  );
}

export default Recommendations;
