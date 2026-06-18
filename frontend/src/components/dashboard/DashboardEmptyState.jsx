import { FiPlus, FiUpload, FiPieChart, FiCompass } from "react-icons/fi";

import FeaturedSectionHeader from "../shared/FeaturedSectionHeader";

import "../../styles/dashboard/DashboardEmptyState.css";

function DashboardEmptyState({
  onAddTransaction,
  onImportStatement,
}) {
  return (
    <section className="dashboard-empty-state">
      <FeaturedSectionHeader
        icon={FiCompass}
        title="Добавьте первые операции"
        subtitle="С чего начать работу с бюджетом"
      />

      <p>
        Пока в кошельке нет данных - прогноз, аналитика и рекомендации
        появятся после доходов и расходов. Начните с одной операции
        или импорта выписки.
      </p>

      <div className="dashboard-empty-actions">
        <button
          type="button"
          className="dashboard-empty-btn primary"
          onClick={onAddTransaction}
        >
          <FiPlus />
          Добавить операцию
        </button>
        <button
          type="button"
          className="dashboard-empty-btn"
          onClick={onImportStatement}
        >
          <FiUpload />
          Импорт выписки
        </button>
      </div>

      <ul className="dashboard-empty-steps">
        <li>
          <FiPlus />
          <span>Запишите зарплату или другой доход</span>
        </li>
        <li>
          <FiUpload />
          <span>Импортируйте PDF из банка - категории подставит AI</span>
        </li>
        <li>
          <FiPieChart />
          <span>Откройте аналитику и рекомендации</span>
        </li>
      </ul>
    </section>
  );
}

export default DashboardEmptyState;
