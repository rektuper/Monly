import {
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  FiCheck,
  FiCopy,
  FiLink,
  FiLogOut,
  FiPieChart,
  FiSettings,
  FiShield,
  FiTrash2,
  FiUserPlus,
  FiUsers,
  FiCreditCard,
  FiX,
} from "react-icons/fi";

import api from "../api/api";
import { AuthContext } from "../context/AuthContext";
import useModal from "../hooks/useModal";
import Sidebar from "../components/layout/Sidebar";
import PageHeader from "../components/layout/PageHeader";
import ModalPortal from "../components/shared/ModalPortal";
import UserAvatar from "../components/shared/UserAvatar";
import { PERMISSION_LABELS } from "../utils/currency";
import { formatMoney } from "../utils/transactionAnalytics";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

import "../styles/pages/Family.css";
import "../styles/shared/ModalOverlay.css";

const ONBOARDING_FEATURES = [
  {
    icon: FiCreditCard,
    title: "Общий кошелёк",
    text: "Операции всей семьи в одном месте",
  },
  {
    icon: FiPieChart,
    title: "Аналитика",
    text: "Дашборд и отчёты для всех",
  },
  {
    icon: FiShield,
    title: "Права доступа",
    text: "Владелец, участник, наблюдатель",
  },
];

function pluralMembers(count) {
  if (count === 1) return "участник";
  if (count >= 2 && count <= 4) return "участника";
  return "участников";
}

function FamilyModal({ isOpen, onClose, title, children, wide }) {
  const { handleOverlayClick, handleModalClick, overlayRef } = useModal({
    isOpen,
    onClose,
  });

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen}>
      <div
        ref={overlayRef}
        className="modal-overlay"
        onClick={handleOverlayClick}
      >
        <div
          className={`family-modal${wide ? " family-modal-wide" : ""}`}
          onClick={handleModalClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="family-modal-title"
        >
          <div className="family-modal-head">
            <h2 id="family-modal-title">{title}</h2>
            <button
              type="button"
              className="family-modal-close"
              onClick={onClose}
              aria-label="Закрыть"
            >
              <FiX />
            </button>
          </div>
          {children}
        </div>
      </div>
    </ModalPortal>
  );
}

function JoinByCodeForm() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const handleJoin = (event) => {
    event.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    navigate(`/family/join-code/${trimmed}`);
  };

  return (
    <form className="family-join-form" onSubmit={handleJoin}>
      <input
        type="text"
        placeholder="• • • • • •"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        maxLength={6}
        autoComplete="off"
        spellCheck={false}
      />
      <button type="submit" className="family-btn primary">
        Вступить
      </button>
    </form>
  );
}

function PermissionBadge({ role }) {
  return (
    <span className={`family-badge family-badge--${role}`}>
      {role === "owner" && <FiShield />}
      {PERMISSION_LABELS[role] || role}
    </span>
  );
}

function Family() {
  const { user } = useContext(AuthContext);
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    currency: "RUB",
    initial_balance: "",
    family_role: "",
  });

  const [settingsForm, setSettingsForm] = useState({
    name: "",
    description: "",
    currency: "RUB",
    initial_balance: "",
  });

  const [myRole, setMyRole] = useState("");
  const [roleSaving, setRoleSaving] = useState(false);
  const [inviteData, setInviteData] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const isOwner = family?.my_permission_role === "owner";
  const isAlone = (family?.members?.length ?? 0) === 1;
  const ownerCount = family?.members?.filter(
    (member) => member.permission_role === "owner"
  ).length ?? 0;
  const isSoleOwnerAmongMany = isOwner && !isAlone && ownerCount <= 1;
  const canLeaveFamily = !isSoleOwnerAmongMany;

  const loadFamily = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.get("/families/me");
      setFamily(response.data);
      setSettingsForm({
        name: response.data.name || "",
        description: response.data.description || "",
        currency: response.data.currency || "RUB",
        initial_balance: String(response.data.initial_balance ?? 0),
      });
    } catch (_) {
      setFamily(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFamily();
  }, [loadFamily]);

  useEffect(() => {
    if (!family?.members?.length || !user?.id) return;

    const me = family.members.find(
      (member) => member.user_id === user.id
    );

    if (me) {
      setMyRole(me.family_role || "");
    }
  }, [family, user?.id]);

  const showMessage = (text, isError = false) => {
    setNotice({ text, isError });
    window.setTimeout(() => setNotice(null), 5000);
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    if (!createForm.name.trim() || !createForm.family_role.trim()) {
      return;
    }

    try {
      const response = await api.post("/families", {
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
        currency: createForm.currency,
        initial_balance: Number(createForm.initial_balance) || 0,
        family_role: createForm.family_role.trim(),
      });

      setFamily(response.data);
      setCreateForm({
        name: "",
        description: "",
        currency: "RUB",
        initial_balance: "",
        family_role: "",
      });
      showMessage("Совместный бюджет создан");
    } catch (err) {
      showMessage(
        err.response?.data?.detail || "Не удалось создать бюджет",
        true
      );
    }
  };

  const handleCreateInvite = async () => {
    setInviteLoading(true);

    try {
      const response = await api.post("/families/invites");
      setInviteData(response.data);
      setShareOpen(true);
      showMessage("Приглашение создано");
    } catch (err) {
      showMessage(
        err.response?.data?.detail || "Не удалось создать приглашение",
        true
      );
    } finally {
      setInviteLoading(false);
    }
  };

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      showMessage(`${label} скопировано`);
    } catch (_) {
      showMessage(text);
    }
  };

  const saveMyRole = async () => {
    setRoleSaving(true);

    try {
      await api.patch("/families/me/members/me", {
        family_role: myRole.trim(),
      });
      showMessage("Роль сохранена");
      loadFamily();
    } catch (_) {
      showMessage("Не удалось сохранить роль", true);
    } finally {
      setRoleSaving(false);
    }
  };

  const saveSettings = async (event) => {
    event.preventDefault();

    try {
      const response = await api.patch("/families/me", {
        name: settingsForm.name.trim(),
        description: settingsForm.description.trim() || null,
        currency: settingsForm.currency,
        initial_balance: Number(settingsForm.initial_balance) || 0,
      });

      setFamily(response.data);
      setSettingsOpen(false);
      showMessage("Настройки сохранены");
    } catch (err) {
      showMessage(
        err.response?.data?.detail || "Не удалось сохранить настройки",
        true
      );
    }
  };

  const changeMemberPermission = async (userId, permissionRole) => {
    try {
      await api.patch(`/families/me/members/${userId}`, {
        permission_role: permissionRole,
      });
      showMessage("Права обновлены");
      loadFamily();
    } catch (err) {
      showMessage(
        err.response?.data?.detail || "Не удалось изменить права",
        true
      );
    }
  };

  const removeMember = async (userId, name) => {
    if (!window.confirm(`Удалить ${name} из бюджета?`)) {
      return;
    }

    try {
      await api.delete(`/families/me/members/${userId}`);
      showMessage("Участник удалён");
      loadFamily();
    } catch (err) {
      showMessage(
        err.response?.data?.detail || "Не удалось удалить участника",
        true
      );
    }
  };

  const leaveFamily = async () => {
    const confirmMessage = isAlone
      ? "Вы единственный участник. Семья будет удалена. Продолжить?"
      : "Выйти из совместного бюджета?";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await api.post("/families/me/leave");

      setFamily(null);
      setInviteData(null);

      showMessage(
        response.data?.message === "Family group deleted"
          ? "Семья удалена"
          : "Вы вышли из бюджета"
      );
    } catch (err) {
      showMessage(
        getApiErrorMessage(err, "Не удалось выйти из бюджета"),
        true
      );
    }
  };

  const myMember = family?.members?.find(
    (member) => member.user_id === user?.id
  );

  const headerActions = family && isOwner ? (
    <>
      <button
        type="button"
        className="family-header-btn"
        onClick={() => setSettingsOpen(true)}
      >
        <FiSettings />
        <span>Настройки</span>
      </button>
      <button
        type="button"
        className="family-header-btn primary"
        onClick={handleCreateInvite}
        disabled={inviteLoading}
      >
        <FiUserPlus />
        <span>{inviteLoading ? "..." : "Пригласить"}</span>
      </button>
    </>
  ) : null;

  return (
    <div className="dashboard-layout family-page">
      <Sidebar />

      <main className="dashboard-content app-page-panel family-content">
        <PageHeader
          icon={FiUsers}
          title="Совместный бюджет"
          subtitle={
            family
              ? family.name
              : "Объедините финансы семьи"
          }
          actions={headerActions}
        />

        {notice && (
          <div
            className={`family-toast${notice.isError ? " error" : ""}`}
            role="status"
          >
            {notice.text}
          </div>
        )}

        {loading ? (
          <div className="family-skeleton">
            <div className="family-skeleton-banner" />
            <div className="family-skeleton-grid">
              <div className="family-skeleton-block" />
              <div className="family-skeleton-block" />
            </div>
          </div>
        ) : family ? (
          <>
            <section className="family-banner">
              <div className="family-banner-main">
                <div className="family-banner-text">
                  <h2>{family.name}</h2>
                  {family.description && (
                    <p>{family.description}</p>
                  )}
                </div>

                <div className="family-banner-avatars">
                  {family.members.map((member, index) => (
                    <UserAvatar
                      key={member.user_id}
                      name={member.name}
                      avatarUrl={member.avatar_url}
                      size={40}
                      className={
                        index > 0 ? "family-banner-avatar-offset" : ""
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="family-metrics">
                <span className="family-chip">
                  <FiUsers aria-hidden />
                  <strong>{family.members.length}</strong>
                  {pluralMembers(family.members.length)}
                </span>

                {myMember?.family_role && (
                  <span className="family-chip">
                    <FiShield aria-hidden />
                    <span className="family-chip-role">
                      {myMember.family_role.trim()}
                    </span>
                    <span className="family-chip-muted">ваша роль</span>
                  </span>
                )}

                {Number(family.initial_balance) > 0 && (
                  <span className="family-chip">
                    <strong>{formatMoney(family.initial_balance)}</strong>
                    <span className="family-chip-muted">· старт</span>
                  </span>
                )}
              </div>
            </section>

            <div className="family-body">
              <section className="family-panel family-panel--members">
                <div className="family-panel-head">
                  <h3>Участники</h3>
                  <span>{family.members.length}</span>
                </div>

                <div className="family-members-grid">
                  {family.members.map((member) => {
                    const isMe = member.user_id === user?.id;

                    return (
                      <article
                        key={member.user_id}
                        className={`family-member-card${isMe ? " is-me" : ""}`}
                      >
                        <UserAvatar
                          name={member.name}
                          avatarUrl={member.avatar_url}
                          size={56}
                        />

                        <div className="family-member-card-body">
                          <strong title={member.name}>{member.name}</strong>

                          {member.family_role && (
                            <span className="family-member-nickname">
                              {member.family_role}
                            </span>
                          )}

                          <div className="family-member-card-badges">
                            {isMe && (
                              <span className="family-badge family-badge--you">
                                Вы
                              </span>
                            )}
                            <PermissionBadge role={member.permission_role} />
                          </div>
                        </div>

                        {isOwner && !isMe && (
                          <div className="family-member-card-actions">
                            <select
                              className="family-select"
                              value={member.permission_role}
                              onChange={(event) =>
                                changeMemberPermission(
                                  member.user_id,
                                  event.target.value
                                )
                              }
                              aria-label={`Права ${member.name}`}
                            >
                              <option value="participant">Участник</option>
                              <option value="observer">Наблюдатель</option>
                              <option value="owner">Владелец</option>
                            </select>

                            <button
                              type="button"
                              className="family-icon-btn danger"
                              onClick={() =>
                                removeMember(member.user_id, member.name)
                              }
                              aria-label={`Удалить ${member.name}`}
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>

              <aside className="family-aside">
                <section className="family-panel">
                  <div className="family-panel-head">
                    <h3>Моя роль</h3>
                  </div>

                  {family.my_permission_role === "observer" ? (
                    <p className="family-aside-hint">
                      Наблюдатели не могут менять роль. Обратитесь к
                      владельцу бюджета.
                    </p>
                  ) : (
                    <div className="family-role-field">
                      <input
                        type="text"
                        value={myRole}
                        onChange={(event) => setMyRole(event.target.value)}
                        placeholder="муж, жена, сын..."
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            saveMyRole();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="family-icon-btn primary"
                        onClick={saveMyRole}
                        disabled={roleSaving}
                        aria-label="Сохранить роль"
                      >
                        <FiCheck />
                      </button>
                    </div>
                  )}

                </section>

                <section className="family-panel family-panel--danger">
                  {isSoleOwnerAmongMany && (
                    <p className="family-aside-hint">
                      Назначьте другого владельца, чтобы выйти
                    </p>
                  )}

                  <button
                    type="button"
                    className="family-leave-link"
                    onClick={leaveFamily}
                    disabled={!canLeaveFamily}
                  >
                    <FiLogOut />
                    {isAlone ? "Удалить семью" : "Выйти из бюджета"}
                  </button>
                </section>
              </aside>
            </div>
          </>
        ) : (
          <div className="family-empty">
            <section className="family-panel family-panel--create">
              <div className="family-empty-head">
                <span className="family-empty-icon">
                  <FiUsers />
                </span>
                <div>
                  <h2>Создайте семейный бюджет</h2>
                  <p>Пригласите близких и ведите финансы вместе</p>
                </div>
              </div>

              <div className="family-features">
                {ONBOARDING_FEATURES.map((feature) => (
                  <div key={feature.title} className="family-feature">
                    <feature.icon />
                    <div>
                      <strong>{feature.title}</strong>
                      <span>{feature.text}</span>
                    </div>
                  </div>
                ))}
              </div>

              <form className="family-form" onSubmit={handleCreate}>
                <div className="family-form-row">
                  <label className="family-field">
                    <span>Название</span>
                    <input
                      type="text"
                      placeholder="Семейный бюджет"
                      value={createForm.name}
                      onChange={(event) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>

                  <label className="family-field">
                    <span>Ваша роль</span>
                    <input
                      type="text"
                      placeholder="муж, жена..."
                      value={createForm.family_role}
                      onChange={(event) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          family_role: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                </div>

                <label className="family-field">
                  <span>Описание</span>
                  <input
                    type="text"
                    placeholder="Необязательно"
                    value={createForm.description}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                  />
                </label>

                <button type="submit" className="family-btn primary full">
                  Создать бюджет
                </button>
              </form>
            </section>

            <section className="family-panel family-panel--join">
              <h3>Есть код приглашения?</h3>
              <p>Введите 6 символов от владельца бюджета</p>
              <JoinByCodeForm />
            </section>
          </div>
        )}
      </main>

      <FamilyModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Настройки бюджета"
      >
        <form className="family-form" onSubmit={saveSettings}>
          <label className="family-field">
            <span>Название</span>
            <input
              type="text"
              value={settingsForm.name}
              onChange={(event) =>
                setSettingsForm((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              required
            />
          </label>

          <label className="family-field">
            <span>Описание</span>
            <textarea
              value={settingsForm.description}
              onChange={(event) =>
                setSettingsForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              rows={3}
              placeholder="Необязательно"
            />
          </label>

          <label className="family-field">
            <span>Начальный баланс</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={settingsForm.initial_balance}
              onChange={(event) =>
                setSettingsForm((prev) => ({
                  ...prev,
                  initial_balance: event.target.value,
                }))
              }
            />
          </label>

          <div className="family-modal-actions">
            <button
              type="button"
              className="family-btn"
              onClick={() => setSettingsOpen(false)}
            >
              Отмена
            </button>
            <button type="submit" className="family-btn primary">
              Сохранить
            </button>
          </div>
        </form>
      </FamilyModal>

      <FamilyModal
        isOpen={shareOpen && Boolean(inviteData)}
        onClose={() => setShareOpen(false)}
        title="Пригласить в бюджет"
        wide
      >
        {inviteData && (
          <div className="family-share">
            <p className="family-share-lead">
              Отправьте код или ссылку - человек сможет вступить
              в «{family?.name}»
            </p>

            <div className="family-share-code">
              <span>Код доступа</span>
              <strong>{inviteData.access_code}</strong>
              <button
                type="button"
                className="family-share-copy"
                onClick={() => copyText(inviteData.access_code, "Код")}
              >
                <FiCopy />
                Копировать
              </button>
            </div>

            <div className="family-share-link">
              <span>Ссылка</span>
              <p>{inviteData.invite_url}</p>
              <button
                type="button"
                className="family-share-copy"
                onClick={() => copyText(inviteData.invite_url, "Ссылка")}
              >
                <FiLink />
                Копировать ссылку
              </button>
            </div>
          </div>
        )}
      </FamilyModal>
    </div>
  );
}

export default Family;
