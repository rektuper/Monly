import {
  FiCreditCard,
  FiPieChart,
  FiZap,
  FiUsers,
  FiTarget,
} from "react-icons/fi";

import "../../styles/home/HomePreview.css";

const FEATURES = [
  {
    icon: FiCreditCard,
    title: "Кошелёк",
    description:
      "Баланс, быстрая статистика, категории расходов и импорт выписок из банка — всё в одном месте.",
    image: "/demo/preview/wallet.png",
    alt: "Экран кошелька с балансом и операциями",
  },
  {
    icon: FiPieChart,
    title: "Аналитика",
    description:
      "Графики по категориям, тренды доходов и расходов, топ трат и обзор по периодам.",
    image: "/demo/preview/analytics.png",
    alt: "Экран аналитики с графиками",
  },
  {
    icon: FiZap,
    title: "Рекомендации и прогноз",
    description:
      "ИИ подскажет, где можно сэкономить, и покажет прогноз баланса на основе ваших привычек.",
    image: "/demo/preview/recommendations.png",
    alt: "Экран рекомендаций и прогноза",
  },
  {
    icon: FiTarget,
    title: "Цели и бюджеты",
    description:
      "Ставьте финансовые цели и задавайте лимиты по категориям — следите за прогрессом каждый месяц.",
    image: "/demo/preview/goals.png",
    alt: "Экран целей с прогрессом накопления",
  },
  {
    icon: FiUsers,
    title: "Совместный бюджет",
    description:
      "Ведите семейные финансы вместе: роли, приглашения по ссылке и общий список операций.",
    image: "/demo/preview/family.png",
    alt: "Экран совместного семейного бюджета",
  },
];

function HomePreview({ onJoin, onLogin, isAuthenticated, onGoToApp, loading }) {
  return (
    <section
      id="home-preview"
      className="home-preview"
      aria-labelledby="home-preview-title"
    >
      <div className="home-preview-inner">
        <p className="home-preview-eyebrow">Возможности</p>
        <h2 id="home-preview-title" className="home-preview-title">
          Что вас ждёт внутри
        </h2>
        <p className="home-preview-lead">
          Монли помогает не просто записывать траты, а понимать финансы:
          анализировать, планировать и принимать решения увереннее.
        </p>

        <div className="home-preview-grid">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            const reversed = index % 2 === 1;

            return (
              <article
                key={feature.title}
                className={`home-preview-card${reversed ? " home-preview-card--reversed" : ""}`}
              >
                <div className="home-preview-card-copy">
                  <div className="home-preview-card-icon" aria-hidden="true">
                    <Icon />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>

                {feature.image && (
                  <div className="home-preview-card-media">
                    <img
                      src={feature.image}
                      alt={feature.alt}
                      loading="lazy"
                      draggable={false}
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <div className="home-preview-cta">
          <p>Готовы попробовать?</p>
          {isAuthenticated ? (
            <button
              type="button"
              className="join-btn"
              onClick={onGoToApp}
              disabled={loading}
            >
              Перейти в приложение
            </button>
          ) : (
            <div className="home-preview-cta-buttons">
              <button
                type="button"
                className="join-btn"
                onClick={onJoin}
                disabled={loading}
              >
                Создать аккаунт
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={onLogin}
                disabled={loading}
              >
                Войти
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default HomePreview;
