import { useEffect, useState } from "react";

import { FiMail, FiX } from "react-icons/fi";

import ModalPortal from "./ModalPortal";

import "../../styles/shared/ForgotPasswordModal.css";

function ForgotPasswordModal({
  isOpen,
  onClose,
  onSubmit,
  initialEmail = "",
}) {
  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setEmail(initialEmail);
    setError("");
    setSuccess("");
    setSubmitting(false);
  }, [isOpen, initialEmail]);

  const handleClose = () => {
    if (submitting) {
      return;
    }
    setError("");
    setSuccess("");
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Укажите email");
      return;
    }

    setSubmitting(true);

    try {
      const message = await onSubmit(trimmedEmail);
      setSuccess(message);
    } catch (submitError) {
      setError(
        submitError.message || "Не удалось отправить письмо"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen}>
      <div
        className="forgot-modal-backdrop"
        onClick={handleClose}
      >
        <div
          className="forgot-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-modal-title"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="forgot-modal-close"
            onClick={handleClose}
            disabled={submitting}
            aria-label="Закрыть"
          >
            <FiX />
          </button>

          <div className="forgot-modal-icon">
            <FiMail />
          </div>

          <h3 id="forgot-modal-title">
            {success ? "Письмо отправлено" : "Восстановление пароля"}
          </h3>

          {!success && (
            <p className="forgot-modal-subtitle">
              Укажите email аккаунта - мы отправим ссылку
              для смены пароля
            </p>
          )}

          {success ? (
            <p className="forgot-modal-success">
              {success}
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                placeholder="Введите ваш e-mail..."
                disabled={submitting}
                autoFocus
              />

              {error && (
                <p className="forgot-modal-error">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="inline-spinner" aria-hidden="true" />
                    Отправляем...
                  </>
                ) : (
                  "Отправить ссылку"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}

export default ForgotPasswordModal;
