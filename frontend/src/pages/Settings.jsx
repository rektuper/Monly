import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FiCamera,
  FiLock,
  FiMail,
  FiPhone,
  FiSave,
  FiShield,
  FiTrash2,
  FiUser,
} from "react-icons/fi";

import api from "../api/api";
import { AuthContext } from "../context/AuthContext";
import { resolveMediaUrl } from "../utils/mediaUrl";

import Sidebar from "../components/layout/Sidebar";
import PageHeader from "../components/layout/PageHeader";
import AvatarCropModal from "../components/settings/AvatarCropModal";
import VerificationModal from "../components/shared/VerificationModal";

import { getApiErrorMessage } from "../utils/apiErrorMessage";

import "../styles/pages/Settings.css";

function Settings() {
  const { user, refreshUser } = useContext(AuthContext);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    last_name: "",
    first_name: "",
    middle_name: "",
    phone: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [cropSrc, setCropSrc] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const showNotice = (text, isError = false) => {
    setNotice({ text, isError });
    window.setTimeout(() => setNotice(null), 4000);
  };

  const loadProfile = async () => {
    setLoading(true);

    try {
      const response = await api.get("/profile");
      const data = response.data;

      setForm({
        last_name: data.last_name || "",
        first_name: data.first_name || "",
        middle_name: data.middle_name || "",
        phone: data.phone || "",
        email: data.email || "",
      });
    } catch (_) {
      showNotice("Не удалось загрузить профиль", true);
    } finally {
      setLoading(false);
    }
  };

  const displayName = useMemo(() => {
    const parts = [
      form.last_name.trim(),
      form.first_name.trim(),
      form.middle_name.trim(),
    ].filter(Boolean);

    if (parts.length) {
      return parts.join(" ");
    }

    return user?.name || "Профиль";
  }, [form, user?.name]);

  const handleChange = (event) => {
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    if (!form.last_name.trim() || !form.first_name.trim()) {
      showNotice("Укажите фамилию и имя", true);
      setSaving(false);
      return;
    }

    try {
      const response = await api.patch("/profile", {
        last_name: form.last_name.trim(),
        first_name: form.first_name.trim(),
        middle_name: form.middle_name.trim(),
        phone: form.phone.trim(),
      });

      await refreshUser();
      setForm((prev) => ({
        ...prev,
        last_name: response.data.last_name || "",
        first_name: response.data.first_name || "",
        middle_name: response.data.middle_name || "",
        phone: response.data.phone || "",
      }));
      showNotice("Профиль сохранён");
    } catch (error) {
      const detail =
        error.response?.data?.detail || "Ошибка сохранения";

      showNotice(
        typeof detail === "string" ? detail : "Ошибка сохранения",
        true
      );
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      showNotice("Выберите изображение", true);
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setCropSrc(reader.result);
      setCropOpen(true);
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const uploadAvatar = async (blob) => {
    setAvatarSaving(true);

    try {
      const formData = new FormData();
      formData.append(
        "file",
        new File([blob], "avatar.jpg", { type: "image/jpeg" })
      );

      await api.post("/profile/avatar", formData);

      await refreshUser();
      setCropOpen(false);
      setCropSrc(null);
      showNotice("Аватар обновлён");
    } catch (error) {
      const raw = error.response?.data?.detail;
      let message = "Не удалось загрузить аватар";

      if (typeof raw === "string") {
        message = raw;
      } else if (Array.isArray(raw) && raw[0]?.msg) {
        message = raw[0].msg;
      }

      showNotice(message, true);
      console.error("Avatar upload failed:", error.response?.data || error);
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleDeleteAvatar = async () => {
    setAvatarSaving(true);

    try {
      await api.delete("/profile/avatar");
      await refreshUser();
      showNotice("Аватар удалён");
    } catch (_) {
      showNotice("Не удалось удалить аватар", true);
    } finally {
      setAvatarSaving(false);
    }
  };

  const handlePasswordChange = (event) => {
    setPasswordForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (passwordForm.newPassword.length < 6) {
      showNotice("Новый пароль - минимум 6 символов", true);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showNotice("Новые пароли не совпадают", true);
      return;
    }

    setPasswordSaving(true);

    try {
      await api.post("/auth/password/request", {
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
      });

      setVerificationOpen(true);
      showNotice("Код подтверждения отправлен на email");
    } catch (error) {
      showNotice(
        getApiErrorMessage(
          error,
          "Не удалось запросить смену пароля"
        ),
        true
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const handlePasswordConfirm = async (code) => {
    await api.post("/auth/password/confirm", { code });

    setVerificationOpen(false);
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    showNotice("Пароль успешно изменён");
  };

  const handlePasswordResend = async () => {
    await api.post("/auth/password/resend");
  };

  const avatarUrl = resolveMediaUrl(user?.avatar_url);

  return (
    <div className="dashboard-layout settings-page">
      <Sidebar />

      <main className="dashboard-content app-page-panel settings-content">
        <PageHeader
          title="Настройки"
          subtitle="Профиль, контакты и безопасность"
        />

        {notice && (
          <div
            className={
              notice.isError
                ? "settings-toast error"
                : "settings-toast"
            }
            role="status"
          >
            {notice.text}
          </div>
        )}

        {loading ? (
          <div className="settings-skeleton">
            <div className="settings-skeleton-main">
              <div className="settings-skeleton-hero" />
              <div className="settings-skeleton-block" />
            </div>
            <div className="settings-skeleton-block" />
          </div>
        ) : (
          <div className="settings-layout">
            <div className="settings-column settings-column-main">
            <section className="settings-card settings-hero">
              <div className="settings-hero-body">
                <button
                  type="button"
                  className="settings-avatar-button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarSaving}
                  aria-label="Изменить фото профиля"
                >
                  <div className="settings-avatar-preview">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" />
                    ) : (
                      <FiUser />
                    )}
                  </div>
                  <span className="settings-avatar-badge">
                    <FiCamera />
                  </span>
                </button>

                <div className="settings-hero-info">
                  <h2>{displayName}</h2>
                  <div className="settings-hero-meta">
                    {form.email && (
                      <span>
                        <FiMail />
                        {form.email}
                      </span>
                    )}
                    {form.phone && (
                      <span>
                        <FiPhone />
                        {form.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="settings-hero-actions">
                <button
                  type="button"
                  className="settings-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarSaving}
                >
                  <FiCamera />
                  {avatarSaving ? "Загрузка..." : "Сменить фото"}
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    className="settings-btn danger"
                    onClick={handleDeleteAvatar}
                    disabled={avatarSaving}
                  >
                    <FiTrash2 />
                    Удалить
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={handleFileSelect}
              />
            </section>

            <form
              className="settings-card settings-panel"
              onSubmit={handleSubmit}
            >
              <header className="settings-panel-head">
                <div className="settings-panel-icon">
                  <FiUser />
                </div>
                <div>
                  <h3>Личные данные</h3>
                  <p>Имя и контактная информация</p>
                </div>
              </header>

              <div className="settings-form-grid">
                <label className="settings-field">
                  <span>Фамилия</span>
                  <input
                    type="text"
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    placeholder="Иванов"
                    required
                  />
                </label>

                <label className="settings-field">
                  <span>Имя</span>
                  <input
                    type="text"
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    placeholder="Иван"
                    required
                  />
                </label>

                <label className="settings-field">
                  <span>Отчество</span>
                  <input
                    type="text"
                    name="middle_name"
                    value={form.middle_name}
                    onChange={handleChange}
                    placeholder="Иванович"
                  />
                </label>

                <label className="settings-field">
                  <span>Телефон</span>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+7 (999) 000-00-00"
                  />
                </label>
              </div>

              <div className="settings-panel-footer">
                <button
                  type="submit"
                  className="settings-btn primary"
                  disabled={saving}
                >
                  <FiSave />
                  {saving ? "Сохранение..." : "Сохранить изменения"}
                </button>
              </div>
            </form>
            </div>

            <section className="settings-column settings-column-security settings-card settings-panel">
              <header className="settings-panel-head">
                <div className="settings-panel-icon security">
                  <FiShield />
                </div>
                <div>
                  <h3>Безопасность</h3>
                  <p>Email и смена пароля</p>
                </div>
              </header>

              <div className="settings-readonly-row">
                <div className="settings-readonly-label">
                  <FiMail />
                  <span>Email аккаунта</span>
                </div>
                <div className="settings-readonly-value">
                  {form.email}
                </div>
                <p className="settings-readonly-hint">
                  Изменение email появится позже
                </p>
              </div>

              <div className="settings-divider" />

              <form
                className="settings-password-form"
                onSubmit={handlePasswordSubmit}
              >
                <div className="settings-password-head">
                  <FiLock />
                  <span>Смена пароля</span>
                </div>

                <div className="settings-password-fields">
                  <label className="settings-field settings-field-full">
                    <span>Текущий пароль</span>
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="Введите текущий пароль"
                      autoComplete="current-password"
                      required
                    />
                  </label>

                  <label className="settings-field">
                    <span>Новый пароль</span>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Минимум 6 символов"
                      autoComplete="new-password"
                      required
                    />
                  </label>

                  <label className="settings-field">
                    <span>Подтверждение</span>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Повторите пароль"
                      autoComplete="new-password"
                      required
                    />
                  </label>
                </div>

                <div className="settings-panel-footer">
                  <button
                    type="submit"
                    className="settings-btn primary"
                    disabled={passwordSaving}
                  >
                    <FiLock />
                    {passwordSaving
                      ? "Отправляем код..."
                      : "Сменить пароль"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        <AvatarCropModal
          isOpen={cropOpen}
          imageSrc={cropSrc}
          saving={avatarSaving}
          onClose={() => {
            if (!avatarSaving) {
              setCropOpen(false);
              setCropSrc(null);
            }
          }}
          onSave={uploadAvatar}
        />

        <VerificationModal
          isOpen={verificationOpen}
          email={form.email}
          title="Подтвердите смену пароля"
          subtitle="Мы отправили 6-значный код на"
          purpose="password_change"
          onClose={() => setVerificationOpen(false)}
          onConfirm={async (code) => {
            try {
              await handlePasswordConfirm(code);
            } catch (error) {
              throw new Error(
                getApiErrorMessage(
                  error,
                  "Неверный или просроченный код"
                )
              );
            }
          }}
          onResend={async () => {
            try {
              await handlePasswordResend();
            } catch (error) {
              throw new Error(
                getApiErrorMessage(
                  error,
                  "Не удалось отправить код повторно"
                )
              );
            }
          }}
        />
      </main>
    </div>
  );
}

export default Settings;
