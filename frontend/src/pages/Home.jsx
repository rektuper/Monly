import { useContext } from "react";
import { useNavigate } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";
import BrandLogo from "../components/shared/BrandLogo";
import HeroCarousel from "../components/home/HeroCarousel";
import { authHeroBackgroundStyle } from "../utils/authHeroBackground";

import "../styles/pages/Home.css";

function Home() {
  const navigate = useNavigate();
  const { user, loading, getToken } = useContext(AuthContext);

  const isAuthenticated = Boolean(user || getToken());

  const goToApp = () => {
    navigate("/dashboard");
  };

  const handleGuestLogin = () => {
    navigate("/login");
  };

  const handleGuestJoin = () => {
    navigate("/register");
  };

  return (
    <div
      className="home-page"
      style={authHeroBackgroundStyle}
    >
      <div className="home-overlay">
        <main
          className={`hero-section${isAuthenticated ? " hero-section--auth" : ""}`}
        >
          <div className="hero-content">
            <BrandLogo variant="hero" />
            <span className="hero-badge">
              Интеллектуальная система управления бюджетом
            </span>
            <h1>
              Управляйте финансами разумнее
            </h1>
            <p>
              Анализируйте доходы и расходы, получайте интеллектуальные
              финансовые рекомендации и достигайте целей быстрее.
            </p>
            <div className="hero-buttons">
              {isAuthenticated ? (
                <button
                  type="button"
                  className="join-btn"
                  onClick={goToApp}
                  disabled={loading}
                >
                  Перейти в приложение
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="join-btn"
                    onClick={handleGuestJoin}
                    disabled={loading}
                  >
                    Присоединяйся
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={handleGuestLogin}
                    disabled={loading}
                  >
                    Войти
                  </button>
                </>
              )}
            </div>
          </div>

          <HeroCarousel />
        </main>
      </div>
    </div>
  );
}

export default Home;
