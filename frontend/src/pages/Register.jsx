import {
  useState,
  useContext,
  useEffect,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import api from "../api/api";

import {
  AuthContext,
} from "../context/AuthContext";

import BrandLogo from "../components/shared/BrandLogo";
import VerificationModal from "../components/shared/VerificationModal";
import "../styles/pages/Auth.css";
import { authHeroBackgroundStyle } from "../utils/authHeroBackground";
import {
  getApiErrorMessage,
  isValidEmail,
} from "../utils/apiErrorMessage";


function Register() {
  const navigate = useNavigate();

  const {
    login,
    user,
    loading,
  } = useContext(AuthContext);

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, user, navigate]);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [submitting, setSubmitting] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const [formData, setFormData] =
    useState({
      last_name: "",
      first_name: "",
      middle_name: "",
      email: "",
      password: "",
      confirmPassword: "",
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

    if (
      formData.password !==
      formData.confirmPassword
    ) {
      setErrorMessage(
        "Пароли не совпадают"
      );

      return;
    }

    if (
      !formData.last_name.trim() ||
      !formData.first_name.trim()
    ) {
      setErrorMessage(
        "Укажите фамилию и имя"
      );
      return;
    }

    const email = formData.email.trim();

    if (!isValidEmail(email)) {
      setErrorMessage("Укажите корректный email");
      return;
    }

    if (!formData.password) {
      setErrorMessage("Укажите пароль");
      return;
    }

    setSubmitting(true);

    try {
      await api.post(
        "/auth/register/request",
        {
          last_name: formData.last_name.trim(),
          first_name: formData.first_name.trim(),
          middle_name: formData.middle_name.trim() || null,
          email,
          password: formData.password,
        }
      );

      setPendingEmail(email);
      setVerificationOpen(true);
    } catch (error) {
      console.error(error);

      setErrorMessage(
        getApiErrorMessage(
          error,
          "Ошибка регистрации. Попробуйте позже."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCode = async (code) => {
    const response = await api.post(
      "/auth/register/confirm",
      {
        email: pendingEmail,
        code,
      }
    );

    const token = response.data.access_token;

    await login(token);
    setVerificationOpen(false);
    navigate("/dashboard");
  };

  const handleResendCode = async () => {
    try {
      await api.post(
        "/auth/register/resend",
        {
          email: pendingEmail,
          purpose: "registration",
        }
      );
    } catch (error) {
      throw new Error(
        getApiErrorMessage(
          error,
          "Не удалось отправить код повторно"
        )
      );
    }
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
              Ваш умный финансовый помощник
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
            <h2>
              Регистрация
            </h2>
            <p className="auth-subtitle">
              Начните разумнее управлять своими финансами
            </p>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                name="last_name"
                placeholder="Фамилия"
                onChange={handleChange}
              />
              <input
                type="text"
                name="first_name"
                placeholder="Имя"
                onChange={handleChange}
              />
              <input
                type="text"
                name="middle_name"
                placeholder="Отчество (необязательно)"
                onChange={handleChange}
              />
              <input
                type="email"
                name="email"
                placeholder="Введите ваш e-mail..."
                onChange={handleChange}
              />
              <input
                type="password"
                name="password"
                placeholder="Введите пароль..."
                onChange={handleChange}
              />
              <input
                type="password"
                name="confirmPassword"
                placeholder="Подтвердите пароль..."
                onChange={handleChange}
              />
              {
                errorMessage && (
                  <div className="auth-error">
                    {errorMessage}
                  </div>
                )
              }
              <button
                type="submit"
                className="auth-submit-btn"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="inline-spinner" aria-hidden="true" />
                    Отправляем код...
                  </>
                ) : (
                  "Регистрация"
                )}
              </button>
            </form>

            <p className="bottom-link">
              У вас уже есть аккаунт?
              <span
                onClick={() =>
                  navigate("/login")
                }
              >
                Войти
              </span>
            </p>
          </div>
        </div>
      </div>

      <VerificationModal
        isOpen={verificationOpen}
        email={pendingEmail}
        title="Подтвердите email"
        subtitle="Мы отправили 6-значный код на"
        purpose="registration"
        onClose={() => setVerificationOpen(false)}
        onConfirm={async (code) => {
          try {
            await handleConfirmCode(code);
          } catch (error) {
            throw new Error(
              getApiErrorMessage(
                error,
                "Неверный или просроченный код"
              )
            );
          }
        }}
        onResend={handleResendCode}
      />
    </div>
  );
}

export default Register;
