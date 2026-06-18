import { useEffect, useState } from "react";

import {
  FiActivity,
  FiCpu,
  FiDatabase,
  FiRefreshCw,
  FiShield,
  FiUsers,
} from "react-icons/fi";

import api from "../api/api";

import Sidebar from "../components/layout/Sidebar";
import PageHeader from "../components/layout/PageHeader";

import "../styles/pages/Admin.css";

const TABS = [
  { id: "overview", label: "Обзор", icon: FiActivity },
  { id: "ai", label: "AI-модуль", icon: FiCpu },
  { id: "users", label: "Пользователи", icon: FiUsers },
];

function Admin() {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [notice, setNotice] = useState(null);

  const showNotice = (text, isError = false) => {
    setNotice({ text, isError });
    window.setTimeout(() => setNotice(null), 5000);
  };

  const fetchOverview = async () => {
    const response = await api.get("/admin/dashboard");
    setStats(response.data);
  };

  const fetchAi = async () => {
    const [statusRes, feedbackRes] = await Promise.all([
      api.get("/admin/ai/status"),
      api.get("/admin/ai/feedback"),
    ]);

    setAiStatus(statusRes.data);
    setFeedback(feedbackRes.data);
  };

  const fetchUsers = async () => {
    const response = await api.get("/admin/users");
    setUsers(response.data);
  };

  const loadTab = async (activeTab) => {
    setLoading(true);

    try {
      if (activeTab === "overview") {
        await fetchOverview();
      }

      if (activeTab === "ai") {
        await Promise.all([fetchOverview(), fetchAi()]);
      }

      if (activeTab === "users") {
        await fetchUsers();
      }
    } catch (_) {
      showNotice("Не удалось загрузить данные админки", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTab(tab);
  }, [tab]);

  const runAction = async (key, request, successMessage) => {
    setActionLoading(key);

    try {
      const response = await request();
      showNotice(successMessage(response.data));
      await loadTab(tab);
    } catch (error) {
      const detail =
        error.response?.data?.detail || "Ошибка выполнения";

      showNotice(
        typeof detail === "string" ? detail : "Ошибка выполнения",
        true
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleRetrain = () =>
    runAction(
      "retrain",
      () => api.post("/admin/ai/retrain"),
      (data) =>
        `Модель переобучена. Примеров в датасете: ${data.retrain?.dataset_size ?? "-"}`
    );

  const handleMergeFeedback = () =>
    runAction(
      "merge",
      () => api.post("/admin/ai/merge-feedback"),
      (data) =>
        `Feedback объединён: добавлено ${data.added ?? 0}, всего ${data.total ?? "-"}`
    );

  const handleRecategorize = () =>
    runAction(
      "recategorize",
      () => api.post("/admin/ai/recategorize-pending"),
      (data) =>
        `Перекатегоризовано ${data.updated} из ${data.processed} операций`
    );

  const handleFixIncome = () =>
    runAction(
      "fix-income",
      () => api.post("/admin/transactions/fix-income-categories"),
      (data) =>
        `Доходы: обновлено ${data.updated} из ${data.income_transactions} (пользователей: ${data.users_processed})`
    );

  const handleApplyRules = () =>
    runAction(
      "apply-rules",
      () => api.post("/admin/transactions/apply-known-rules"),
      (data) =>
        `Правила: обновлено ${data.total_updated} (расходы ${data.expense_updated}, доходы ${data.income_updated})`
    );

  const handleRoleChange = async (userId, role) => {
    setActionLoading(`role-${userId}`);

    try {
      await api.patch(`/admin/users/${userId}/role`, { role });
      showNotice("Роль пользователя обновлена");
      await fetchUsers();
    } catch (error) {
      const detail =
        error.response?.data?.detail || "Не удалось сменить роль";

      showNotice(detail, true);
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div className="dashboard-layout admin-page">
      <Sidebar />

      <main className="dashboard-content app-page-panel admin-content">
        <PageHeader
          icon={FiShield}
          title="Админ-панель"
          subtitle="Управление системой и AI."
        />

        {notice && (
          <div
            className={
              notice.isError
                ? "admin-notice error"
                : "admin-notice"
            }
          >
            {notice.text}
          </div>
        )}

        <nav className="admin-tabs">
          {TABS.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                className={
                  tab === item.id
                    ? "admin-tab active"
                    : "admin-tab"
                }
                onClick={() => setTab(item.id)}
              >
                <Icon />
                {item.label}
              </button>
            );
          })}
        </nav>

        {loading ? (
          <p className="admin-loading-text">Загрузка...</p>
        ) : (
          <>
            {tab === "overview" && stats && (
              <section className="admin-grid">
                <article className="admin-card">
                  <span>Пользователи</span>
                  <strong>{stats.users_count}</strong>
                </article>
                <article className="admin-card">
                  <span>Операции</span>
                  <strong>{stats.transactions_count}</strong>
                </article>
                <article className="admin-card highlight-warn">
                  <span>На проверке AI</span>
                  <strong>{stats.pending_review_count}</strong>
                </article>
                <article className="admin-card highlight-info">
                  <span>Feedback (ожидает слияния)</span>
                  <strong>{stats.feedback_pending_count}</strong>
                </article>
                <article className="admin-card">
                  <FiDatabase />
                  <span>Обучающий датасет</span>
                  <strong>{stats.dataset_size}</strong>
                </article>
              </section>
            )}

            {tab === "ai" && aiStatus && (
              <div className="admin-ai-layout">
                <section className="admin-panel">
                  <h2>Состояние модуля</h2>
                  <ul className="admin-meta-list">
                    <li>
                      Примеров в датасете:{" "}
                      <strong>{aiStatus.dataset_size}</strong>
                    </li>
                    <li>
                      Записей feedback:{" "}
                      <strong>{aiStatus.feedback_count}</strong>
                    </li>
                    <li>
                      Порог уверенности:{" "}
                      <strong>
                        {Math.round(
                          aiStatus.confidence_threshold * 100
                        )}
                        %
                      </strong>
                    </li>
                    <li>
                      Авто-retrain каждые:{" "}
                      <strong>
                        {aiStatus.auto_retrain_batch} правок
                      </strong>
                    </li>
                  </ul>
                  <p className="admin-hint">
                    Пользователи исправляют категории в кошельке - правки
                    попадают в feedback. Переобучение и слияние - только здесь.
                  </p>
                </section>

                <section className="admin-panel">
                  <h2>Действия</h2>
                  <div className="admin-actions">
                    <button
                      type="button"
                      className="admin-action-btn"
                      disabled={!!actionLoading}
                      onClick={handleMergeFeedback}
                    >
                      <FiDatabase />
                      {actionLoading === "merge"
                        ? "..."
                        : "Слить feedback в датасет"}
                    </button>
                    <button
                      type="button"
                      className="admin-action-btn primary"
                      disabled={!!actionLoading}
                      onClick={handleRetrain}
                    >
                      <FiRefreshCw />
                      {actionLoading === "retrain"
                        ? "..."
                        : "Переобучить модель"}
                    </button>
                    <button
                      type="button"
                      className="admin-action-btn"
                      disabled={!!actionLoading}
                      onClick={handleRecategorize}
                    >
                      <FiCpu />
                      {actionLoading === "recategorize"
                        ? "..."
                        : "Перекатегоризовать «на проверке»"}
                    </button>
                    <button
                      type="button"
                      className="admin-action-btn"
                      disabled={!!actionLoading}
                      onClick={handleFixIncome}
                    >
                      <FiRefreshCw />
                      {actionLoading === "fix-income"
                        ? "..."
                        : "Доходы → «Пополнение» (все пользователи)"}
                    </button>
                    <button
                      type="button"
                      className="admin-action-btn primary"
                      disabled={!!actionLoading}
                      onClick={handleApplyRules}
                    >
                      <FiCpu />
                      {actionLoading === "apply-rules"
                        ? "..."
                        : "Применить правила"}
                    </button>
                  </div>
                </section>

                <section className="admin-panel admin-panel-wide">
                  <h2>Последние правки пользователей</h2>
                  {feedback.length === 0 ? (
                    <p className="admin-empty">
                      Feedback пока пуст - появится после исправления
                      категорий в кошельке
                    </p>
                  ) : (
                    <div className="admin-feedback-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Описание</th>
                            <th>Было</th>
                            <th>Стало</th>
                            <th>Источник</th>
                          </tr>
                        </thead>
                        <tbody>
                          {feedback.map((item, index) => (
                            <tr key={`${item.text}-${index}`}>
                              <td className="cell-desc">
                                {item.text}
                              </td>
                              <td>{item.predicted_category}</td>
                              <td>{item.correct_category}</td>
                              <td>{item.source}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            )}

            {tab === "users" && (
              <section className="admin-panel admin-panel-wide">
                <h2>Пользователи</h2>
                <div className="admin-feedback-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Имя</th>
                        <th>Email</th>
                        <th>Операций</th>
                        <th>Роль</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.id}</td>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td>{user.transactions_count}</td>
                          <td>
                            <select
                              className="admin-role-select"
                              value={user.role}
                              disabled={
                                actionLoading ===
                                `role-${user.id}`
                              }
                              onChange={(e) =>
                                handleRoleChange(
                                  user.id,
                                  e.target.value
                                )
                              }
                            >
                              <option value="user">
                                user
                              </option>
                              <option value="admin">
                                admin
                              </option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default Admin;
