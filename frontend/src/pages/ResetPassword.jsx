import {
  useContext,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { FiLock } from "react-icons/fi";

import api from "../api/api";
import { AuthContext } from "../context/AuthContext";
import BrandLogo from "../components/shared/BrandLogo";
import { authHeroBackgroundStyle } from "../utils/authHeroBackground";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

import "../styles/pages/ResetPassword.css";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const { login, user, loading } = useContext(AuthContext);

  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setValid(false);
      setErrorMessage("Ссылка для восстановления недействительна");
      return;
    }

    const validateToken = async () => {
      try {
        const response = await api.get(
          "/auth/reset-password/validate",
          { params: { token } }
        );

        setValid(true);
        setDisplayName(response.data.display_name || "");
        setEmail(response.data.email || "");
      } catch (error) {
        setValid(false);
        setErrorMessage(
          getApiErrorMessage(
            error,
            "Ссылка недействительна или истекла"
          )
        );
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (password.length < 6) {
      setErrorMessage("Пароль - минимум 6 символов");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Пароли не совпадают");
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post(
        "/auth/reset-password",
        {
          token,
          password,
        }
      );

      await login(response.data.access_token);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          "Не удалось сменить пароль"
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="reset-password-page"
      style={authHeroBackgroundStyle}
    >
      <div className="reset-password-overlay">
        <div className="reset-password-modal">
          <BrandLogo variant="badge" />

          {validating ? (
            <p className="reset-password-status">
              Проверяем ссылку...
            </p>
          ) : !valid ? (
            <>
              <h1>Ссылка недействительна</h1>
              <p className="reset-password-subtitle">
                {errorMessage}
              </p>
              <button
                type="button"
                className="reset-password-btn secondary"
                onClick={() => navigate("/login")}
              >
                Вернуться ко входу
              </button>
            </>
          ) : (
            <>
              <div className="reset-password-icon">
                <FiLock />
              </div>

              <h1>Новый пароль</h1>

              <p className="reset-password-subtitle">
                {displayName
                  ? `Здравствуйте, ${displayName}! Задайте новый пароль для ${email}`
                  : `Задайте новый пароль для ${email}`}
              </p>

              <form onSubmit={handleSubmit}>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setErrorMessage("");
                  }}
                  placeholder="Новый пароль"
                  disabled={submitting}
                  autoFocus
                />

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setErrorMessage("");
                  }}
                  placeholder="Повторите пароль"
                  disabled={submitting}
                />

                {errorMessage && (
                  <p className="reset-password-error">
                    {errorMessage}
                  </p>
                )}

                <button
                  type="submit"
                  className="reset-password-btn"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="inline-spinner" aria-hidden="true" />
                      Сохраняем...
                    </>
                  ) : (
                    "Сохранить пароль"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
