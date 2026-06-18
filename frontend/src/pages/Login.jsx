import {
  useState,
  useContext,
  useEffect,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import api from "../api/api";

import {
  AuthContext,
} from "../context/AuthContext";

import BrandLogo from "../components/shared/BrandLogo";
import ForgotPasswordModal from "../components/shared/ForgotPasswordModal";
import "../styles/pages/Auth.css";
import { authHeroBackgroundStyle } from "../utils/authHeroBackground";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);

  const { login, user, loading } =
    useContext(AuthContext);

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, user, navigate]);

  const [formData, setFormData] =
    useState({
      email: "",
      password: "",
    });

  const handleChange = (e) => {
    setErrorMessage("");
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      const response = await api.post(
        "/auth/login",
        formData
      );

      const token = response.data.access_token;

      await login(token, rememberMe);

      const redirect = searchParams.get("redirect");
      navigate(redirect || "/dashboard");
    } catch (error) {
      console.error(error);
      if (
        error.response?.data?.detail
        === "Invalid credentials"
      ) {
        setErrorMessage(
          "Неверный email или пароль"
        );
      } else {
        setErrorMessage(
          "Ошибка входа. Попробуйте позже."
        );
      }
    }
  };

  const handleForgotSubmit = async (email) => {
    const response = await api.post(
      "/auth/forgot-password",
      { email }
    );

    return response.data.message;
  };

  return (
    <div className="auth-page">
      <div
        className="auth-left"
        style={authHeroBackgroundStyle}
      >
        <div className="auth-overlay">
          <div className="brand">
            <BrandLogo variant="auth" />
            <p>
              Ваш персональный финансовый помощник
            </p>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-panel">
          <BrandLogo
            variant="badge"
            className="brand-logo-root--auth-panel"
          />

          <div className="auth-card">
            <h2>С возращением!</h2>

            <p className="auth-subtitle">
              Войти чтобы продолжить.
            </p>
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                name="email"
                placeholder="Введите ваш e-mail..."
                value={formData.email}
                onChange={handleChange}
              />

              <input
                type="password"
                name="password"
                placeholder="Введите пароль..."
                onChange={handleChange}
              />

              {
                errorMessage && (
                  <div className="auth-error">
                    {errorMessage}
                  </div>
                )
              }

              <div className="auth-options">
                <label className="remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) =>
                      setRememberMe(e.target.checked)
                    }
                  />
                  <p>Запомнить меня</p>
                </label>

                <button
                  type="button"
                  className="auth-forgot-link"
                  onClick={() => setForgotOpen(true)}
                >
                  Забыли пароль?
                </button>
              </div>

              <button type="submit">
                Войти
              </button>
            </form>

            <p className="bottom-link">
              Еще не зарегистрированы?
              <span
                onClick={() =>
                  navigate("/register")
                }
              >
                Регистрация
              </span>
            </p>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={forgotOpen}
        initialEmail={formData.email}
        onClose={() => setForgotOpen(false)}
        onSubmit={async (email) => {
          try {
            return await handleForgotSubmit(email);
          } catch (error) {
            throw new Error(
              getApiErrorMessage(
                error,
                "Не удалось отправить письмо"
              )
            );
          }
        }}
      />
    </div>
  );
}

export default Login;
