import {
  useEffect,
  useState,
} from "react";

import { FiMail, FiX } from "react-icons/fi";

import ModalPortal from "./ModalPortal";
import OtpInput from "./OtpInput";

import "../../styles/shared/VerificationModal.css";

function VerificationModal({
  isOpen,
  email,
  title,
  subtitle,
  purpose,
  onClose,
  onConfirm,
  onResend,
  resendCooldown = 60,
}) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(resendCooldown);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    setCode("");
    setError("");
    setSubmitting(false);
    setResending(false);
    setSecondsLeft(resendCooldown);

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => (
        prev > 0 ? prev - 1 : 0
      ));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isOpen, resendCooldown, email]);

  const handleConfirm = async () => {
    if (code.length !== 6) {
      setError("Введите 6-значный код");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await onConfirm(code);
    } catch (submitError) {
      setError(
        submitError.message || "Не удалось подтвердить код"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || resending) {
      return;
    }

    setResending(true);
    setError("");

    try {
      await onResend();
      setSecondsLeft(resendCooldown);
      setCode("");
    } catch (resendError) {
      setError(
        resendError.message || "Не удалось отправить код повторно"
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen}>
      <div
        className="verification-modal-backdrop"
        onClick={submitting ? undefined : onClose}
      >
        <div
          className="verification-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="verification-modal-title"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="verification-modal-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Закрыть"
          >
            <FiX />
          </button>

          <div className="verification-modal-icon">
            <FiMail />
          </div>

          <h3 id="verification-modal-title">
            {title}
          </h3>

          <p className="verification-modal-subtitle">
            {subtitle}
          </p>

          <p className="verification-modal-email">
            {email}
          </p>

          <OtpInput
            value={code}
            onChange={setCode}
            disabled={submitting}
          />

          {error && (
            <p className="verification-modal-error">
              {error}
            </p>
          )}

          <button
            type="button"
            className="verification-modal-submit"
            onClick={handleConfirm}
            disabled={submitting || code.length !== 6}
          >
            {submitting ? (
              <>
                <span className="inline-spinner" aria-hidden="true" />
                Проверяем...
              </>
            ) : (
              "Подтвердить"
            )}
          </button>

          <button
            type="button"
            className="verification-modal-resend"
            onClick={handleResend}
            disabled={secondsLeft > 0 || resending || submitting}
          >
            {resending
              ? "Отправляем..."
              : secondsLeft > 0
                ? `Отправить снова через ${secondsLeft} с`
                : "Отправить код повторно"}
          </button>

          <p className="verification-modal-hint">
            {purpose === "registration"
              ? "Код действует 15 минут. Проверьте папку «Спам», если письма нет."
              : "Код отправлен на ваш email для подтверждения смены пароля."}
          </p>
        </div>
      </div>
    </ModalPortal>
  );
}

export default VerificationModal;
