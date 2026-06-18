import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiUsers } from "react-icons/fi";

import api from "../../api/api";
import { AuthContext } from "../../context/AuthContext";
import useModal from "../../hooks/useModal";
import ModalPortal from "../shared/ModalPortal";
import UserAvatar from "../shared/UserAvatar";

import "../../styles/family/FamilyInviteModal.css";
import { authHeroBackgroundStyle } from "../../utils/authHeroBackground";

function FamilyInviteModal({
  token,
  accessCode,
  isOpen,
  onClose,
  onJoined,
}) {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { handleOverlayClick, handleModalClick, overlayRef } =
    useModal({ isOpen, onClose });

  const [preview, setPreview] = useState(null);
  const [familyRole, setFamilyRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const inviteKey = accessCode || token;
  const isCodeInvite = Boolean(accessCode);

  useEffect(() => {
    if (!isOpen || !inviteKey) {
      return;
    }

    setLoading(true);
    setError("");

    const previewUrl = isCodeInvite
      ? `/families/invites/code/${accessCode}`
      : `/families/invites/${token}`;

    api
      .get(previewUrl)
      .then((response) => {
        setPreview(response.data);
      })
      .catch(() => {
        setError("Приглашение не найдено или ссылка устарела");
        setPreview(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, inviteKey, isCodeInvite, accessCode, token]);

  const handleAccept = async () => {
    if (!familyRole.trim()) {
      setError("Укажите вашу роль в семье");
      return;
    }

    const redirectPath = isCodeInvite
      ? `/family/join-code/${accessCode}`
      : `/family/join/${token}`;

    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    setSubmitting(true);
    setError("");

    const acceptUrl = isCodeInvite
      ? `/families/invites/code/${accessCode}/accept`
      : `/families/invites/${token}/accept`;

    try {
      await api.post(acceptUrl, {
        family_role: familyRole.trim(),
      });

      onJoined?.();
      onClose();
      navigate("/family");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "Не удалось принять приглашение"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <ModalPortal isOpen={isOpen}>
      <div
        ref={overlayRef}
        className="family-invite-overlay"
        style={authHeroBackgroundStyle}
        onClick={handleOverlayClick}
      >
        <div
          className="family-invite-modal"
          onClick={handleModalClick}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="family-invite-close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <FiX />
          </button>

          {loading ? (
            <p className="family-invite-loading">Загрузка приглашения...</p>
          ) : preview ? (
            <>
              <div className="family-invite-icon">
                <FiUsers />
              </div>

              <h2>Вас пригласили в совместный бюджет</h2>

              <p className="family-invite-family-name">
                {preview.family_name}
              </p>

              {preview.family_description && (
                <p className="family-invite-description">
                  {preview.family_description}
                </p>
              )}

              <div className="family-invite-inviter">
                <UserAvatar
                  name={preview.inviter?.name}
                  avatarUrl={preview.inviter?.avatar_url}
                  size={52}
                />
                <div>
                  <strong>{preview.inviter?.name}</strong>
                  <span>
                    {preview.inviter?.family_role || "участник"}
                  </span>
                  <span className="family-invite-date">
                    Приглашение от{" "}
                    {new Date(preview.created_at).toLocaleString(
                      "ru-RU",
                      {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </span>
                </div>
              </div>

              <p className="family-invite-meta">
                Участников: {preview.member_count} · валюта:{" "}
                {preview.currency || "RUB"}
              </p>

              {user ? (
                <>
                  <label className="family-invite-label">
                    Ваша роль в семье
                    <input
                      type="text"
                      placeholder="Например: муж, жена, сын..."
                      value={familyRole}
                      onChange={(e) => setFamilyRole(e.target.value)}
                    />
                  </label>

                  {error && (
                    <p className="family-invite-error">{error}</p>
                  )}

                  <button
                    type="button"
                    className="family-invite-accept"
                    disabled={submitting}
                    onClick={handleAccept}
                  >
                    {submitting ? "Вступаем..." : "Вступить в бюджет"}
                  </button>
                </>
              ) : (
                <>
                  <p className="family-invite-login-hint">
                    Войдите в аккаунт, чтобы принять приглашение
                  </p>
                  <button
                    type="button"
                    className="family-invite-accept"
                    onClick={() =>
                      navigate(
                        `/login?redirect=${encodeURIComponent(
                          isCodeInvite
                            ? `/family/join-code/${accessCode}`
                            : `/family/join/${token}`
                        )}`
                      )
                    }
                  >
                    Войти
                  </button>
                </>
              )}
            </>
          ) : (
            <p className="family-invite-error">{error}</p>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}

export default FamilyInviteModal;
