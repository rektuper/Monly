import {
  FiHome,
  FiCreditCard,
  FiPieChart,
  FiZap,
  FiSettings,
  FiLogOut,
  FiHelpCircle,
  FiUser,
  FiMenu,
  FiX,
  FiMoon,
  FiSun,
  FiShield,
  FiUsers,
} from "react-icons/fi";

import {
  useContext,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  AuthContext,
} from "../../context/AuthContext";

import { resolveMediaUrl } from "../../utils/mediaUrl";
import {
  lockModalBody,
  unlockModalBody,
} from "../../utils/modalBodyLock";
import ModalPortal from "../shared/ModalPortal";

import "../../styles/layout/Sidebar.css";

function SidebarPanels({
  user,
  avatarUrl,
  location,
  theme,
  onNavigate,
  onClose,
  showClose,
  onToggleTheme,
  onLogout,
}) {
  return (
    <>
      <div>
        <div className="sidebar-top">
          <div className="sidebar-profile">
            <div className="profile-icon">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="profile-avatar" />
              ) : (
                <FiUser />
              )}
            </div>

            <div className="sidebar-profile-info">
              <h3 title={user?.name || undefined}>
                {user?.name || "Загрузка..."}
              </h3>
            </div>
          </div>

          {showClose && (
            <button
              type="button"
              className="close-sidebar"
              onClick={onClose}
              aria-label="Закрыть меню"
            >
              <FiX />
            </button>
          )}
        </div>

        <nav className="sidebar-menu">
          <button
            type="button"
            className={
              location.pathname === "/dashboard"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => onNavigate("/dashboard")}
          >
            <FiHome />
            Дашборд
          </button>

          <button
            type="button"
            className={
              location.pathname === "/wallet"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => onNavigate("/wallet")}
          >
            <FiCreditCard />
            Кошелёк
          </button>

          <button
            type="button"
            className={
              location.pathname === "/analytics"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => onNavigate("/analytics")}
          >
            <FiPieChart />
            Аналитика
          </button>

          <button
            type="button"
            className={
              location.pathname === "/recommendations"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => onNavigate("/recommendations")}
          >
            <FiZap />
            Рекомендации
          </button>

          <button
            type="button"
            className={
              location.pathname === "/family"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => onNavigate("/family")}
          >
            <FiUsers />
            Совместный бюджет
          </button>

          {user?.role === "admin" && (
            <button
              type="button"
              className={
                location.pathname === "/admin"
                  ? "menu-item active"
                  : "menu-item"
              }
              onClick={() => onNavigate("/admin")}
            >
              <FiShield />
              Админ-панель
            </button>
          )}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <button
          type="button"
          className={
            location.pathname === "/settings"
              ? "menu-item active"
              : "menu-item"
          }
          onClick={() => onNavigate("/settings")}
        >
          <FiSettings />
          Настройки
        </button>

        <button
          type="button"
          className={
            location.pathname === "/help"
              ? "menu-item active"
              : "menu-item"
          }
          onClick={() => onNavigate("/help")}
        >
          <FiHelpCircle />
          Помощь
        </button>

        <button
          type="button"
          className="menu-item"
          onClick={onToggleTheme}
        >
          {theme === "light" ? <FiMoon /> : <FiSun />}
          {theme === "light" ? "Тёмная тема" : "Светлая тема"}
        </button>

        <button
          type="button"
          className="menu-item logout"
          onClick={onLogout}
        >
          <FiLogOut />
          Выход
        </button>
      </div>
    </>
  );
}

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [theme, setTheme] = useState(() => (
    localStorage.getItem("theme") || "light"
  ));

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    user,
    logout,
  } = useContext(AuthContext);

  document.documentElement.setAttribute("data-theme", theme);

  const avatarUrl = resolveMediaUrl(user?.avatar_url);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    lockModalBody();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      unlockModalBody();
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate("/");
  };

  const navigateTo = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const panelProps = {
    user,
    avatarUrl,
    location,
    theme,
    onNavigate: navigateTo,
    onClose: () => setIsOpen(false),
    onToggleTheme: toggleTheme,
    onLogout: handleLogout,
  };

  const burgerButton = (
    <button
      type="button"
      className={`burger-btn${isOpen ? " burger-btn--hidden" : ""}`}
      onClick={() => setIsOpen(true)}
      aria-label="Открыть меню"
      aria-expanded={isOpen}
    >
      <FiMenu />
    </button>
  );

  return (
    <>
      {isMounted && createPortal(burgerButton, document.body)}

      <aside className="sidebar sidebar--desktop">
        <SidebarPanels {...panelProps} showClose={false} />
      </aside>

      {isOpen && (
        <ModalPortal isOpen={isOpen}>
          <div className="sidebar-mobile-shell">
            <button
              type="button"
              className="sidebar-mobile-overlay"
              onClick={() => setIsOpen(false)}
              aria-label="Закрыть меню"
            />

            <aside
              className="sidebar sidebar--mobile"
              role="dialog"
              aria-modal="true"
              aria-label="Навигация"
            >
              <SidebarPanels
                {...panelProps}
                showClose
              />
            </aside>
          </div>
        </ModalPortal>
      )}
    </>
  );
}

export default Sidebar;
