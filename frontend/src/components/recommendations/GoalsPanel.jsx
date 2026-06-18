import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiPlus,
  FiTrash2,
  FiTarget,
  FiArrowRight,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

import FeaturedSectionHeader from "../shared/FeaturedSectionHeader";
import api from "../../api/api";
import UserAvatar from "../shared/UserAvatar";

import "../../styles/recommendations/GoalsPanel.css";

function GoalRing({ percent, done }) {
  const p = Math.min(Math.round(percent), 100);

  return (
    <div
      className={`goal-ring${done ? " goal-ring--done" : ""}`}
      aria-hidden
    >
      <svg viewBox="0 0 40 40">
        <circle
          className="goal-ring-track"
          cx="20"
          cy="20"
          r="16"
          fill="none"
          strokeWidth="3.5"
        />
        <circle
          className="goal-ring-fill"
          cx="20"
          cy="20"
          r="16"
          fill="none"
          strokeWidth="3.5"
          pathLength="100"
          strokeDasharray={`${p} 100`}
          transform="rotate(-90 20 20)"
        />
      </svg>
      <span>{done ? "✓" : `${p}%`}</span>
    </div>
  );
}

function GoalDepositForm({ goal, onDeposit }) {
  const [amount, setAmount] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!amount) return;

    onDeposit(goal, amount);
    setAmount("");
  };

  return (
    <form
      className="goal-deposit-form"
      onSubmit={handleSubmit}
    >
      <input
        type="number"
        min="1"
        step="1"
        inputMode="numeric"
        placeholder="Сумма, ₽"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        aria-label="Сумма пополнения цели"
      />
      <button type="submit" className="goal-deposit-submit">
        Пополнить
      </button>
    </form>
  );
}

function GoalCard({
  goal,
  isWallet,
  onDelete,
  onDeposit,
}) {
  const progress = goal.target_amount
    ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
    : 0;

  return (
    <article
      className={`goal-item${goal.is_completed ? " goal-item--done" : ""}${isWallet ? " goal-item--wallet" : ""}`}
    >
      {isWallet && (
        <GoalRing percent={progress} done={goal.is_completed} />
      )}

      <div className="goal-item-body">
        <div className="goal-top">
          <div className="goal-title-block">
            <strong>
              {goal.title}
              {goal.is_completed && (
                <span className="goal-done-badge">Достигнута</span>
              )}
            </strong>
            {!isWallet && goal.created_by && (
              <div className="goal-author">
                <UserAvatar
                  name={goal.created_by.name}
                  avatarUrl={goal.created_by.avatar_url}
                  size={28}
                />
                <span>
                  {goal.created_by.name}
                  {goal.created_by.family_role && (
                    <> · {goal.created_by.family_role}</>
                  )}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            className="goal-delete-btn"
            onClick={() => onDelete(goal.id)}
            aria-label="Удалить цель"
          >
            <FiTrash2 />
          </button>
        </div>

        <p className="goal-amounts">
          <span className="goal-current">
            {goal.current_amount.toLocaleString("ru-RU")}
          </span>
          <span className="goal-sep"> / </span>
          <span className="goal-target">
            {goal.target_amount.toLocaleString("ru-RU")} ₽
          </span>
        </p>

        {!isWallet && (
          <div className="goal-progress">
            <div
              className="goal-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {!goal.is_completed && (
          <GoalDepositForm
            goal={goal}
            onDeposit={onDeposit}
          />
        )}
      </div>
    </article>
  );
}

function GoalsPanel({ onUpdated, variant = "default" }) {
  const isWallet = variant === "wallet";
  const [goals, setGoals] = useState([]);
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const fetchGoals = async () => {
    try {
      const response = await api.get("/goals");
      setGoals(response.data);
    } catch (_) {
      setGoals([]);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  useEffect(() => {
    if (activeIndex >= goals.length) {
      setActiveIndex(Math.max(goals.length - 1, 0));
    }
  }, [goals.length, activeIndex]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title || !targetAmount) return;

    try {
      await api.post("/goals", {
        title,
        target_amount: Number(targetAmount),
      });

      setTitle("");
      setTargetAmount("");
      setShowForm(false);
      await fetchGoals();
      setActiveIndex(goals.length);
      onUpdated?.();
    } catch (_) {}
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/goals/${id}`);
      await fetchGoals();
      onUpdated?.();
    } catch (_) {}
  };

  const handleDeposit = async (goal, amount) => {
    const value = Number(amount);
    if (!value || value <= 0) return;

    try {
      await api.patch(`/goals/${goal.id}`, {
        current_amount: Number(goal.current_amount) + value,
      });
      await fetchGoals();
      onUpdated?.();
    } catch (_) {}
  };

  const goPrev = () => {
    setActiveIndex((index) => Math.max(index - 1, 0));
  };

  const goNext = () => {
    setActiveIndex((index) => Math.min(index + 1, goals.length - 1));
  };

  const activeGoal = goals[activeIndex];

  return (
    <section
      className={`goals-panel${isWallet ? " goals-panel--wallet" : ""}`}
    >
      <FeaturedSectionHeader
        icon={FiTarget}
        title={isWallet ? "Цели" : "Финансовые цели"}
        subtitle={
          isWallet
            ? "Копите к цели - прогресс пополняется вручную"
            : "Прогресс пополняется вручную - внесите накопления по кнопке «+»"
        }
      >
        {isWallet && (
          <Link to="/recommendations" className="featured-card-action featured-card-action--soft">
            Советы
            <FiArrowRight />
          </Link>
        )}
      </FeaturedSectionHeader>

      {isWallet ? (
        <div className="goal-form-wallet">
          {showForm ? (
            <form className="goal-form goal-form--wallet" onSubmit={handleCreate}>
              <input
                type="text"
                placeholder="Название"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
              <input
                type="number"
                placeholder="Сумма, ₽"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
              />
              <button type="submit" className="goal-form-submit">
                <FiPlus />
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="goal-add-trigger"
              onClick={() => setShowForm(true)}
            >
              <FiPlus />
              Новая цель
            </button>
          )}
        </div>
      ) : (
        <form className="goal-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Название цели"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="number"
            placeholder="Сумма, ₽"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
          />
          <button type="submit">
            <FiPlus />
          </button>
        </form>
      )}

      {isWallet ? (
        <div className="goals-carousel">
          {goals.length === 0 ? (
            <p className="goals-empty">
              Создайте цель - отпуск, подушка или крупная покупка
            </p>
          ) : (
            <>
              <div className="goals-carousel-nav">
                <button
                  type="button"
                  className="goals-carousel-btn"
                  onClick={goPrev}
                  disabled={activeIndex === 0}
                  aria-label="Предыдущая цель"
                >
                  <FiChevronLeft />
                </button>
                <span className="goals-carousel-counter">
                  {activeIndex + 1} / {goals.length}
                </span>
                <button
                  type="button"
                  className="goals-carousel-btn"
                  onClick={goNext}
                  disabled={activeIndex >= goals.length - 1}
                  aria-label="Следующая цель"
                >
                  <FiChevronRight />
                </button>
              </div>

              {activeGoal && (
                <GoalCard
                  key={activeGoal.id}
                  goal={activeGoal}
                  isWallet
                  onDelete={handleDelete}
                  onDeposit={handleDeposit}
                />
              )}
            </>
          )}
        </div>
      ) : (
        <div className="goals-list">
          {goals.length === 0 ? (
            <p className="goals-empty">Целей пока нет</p>
          ) : (
            goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                isWallet={false}
                onDelete={handleDelete}
                onDeposit={handleDeposit}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}

export default GoalsPanel;
