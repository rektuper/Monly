import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";

import {
  FiUpload,
  FiX,
  FiFileText,
  FiCheckCircle,
  FiAlertCircle,
  FiInbox,
} from "react-icons/fi";

import api from "../../api/api";
import { getApiErrorMessage } from "../../utils/apiErrorMessage";

import useModal from "../../hooks/useModal";
import ModalPortal from "../shared/ModalPortal";
import Spinner from "../shared/Spinner";

import "../../styles/shared/ImportStatementModal.css";
import "../../styles/shared/Spinner.css";

function ImportStatementModal({
  isOpen,
  onClose,
  onTransactionsImported,
}) {
  const {
    handleOverlayClick,
    handleModalClick,
    overlayRef,
  } = useModal({
    isOpen,
    onClose,
  });

  const [file, setFile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [emptyState, setEmptyState] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef(null);

  const resetModal = useCallback(() => {
    setFile(null);
    setTransactions([]);
    setStats(null);
    setLoading(false);
    setSaving(false);
    setSuccess(false);
    setSavedCount(0);
    setEmptyState(false);
    setErrorMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const closeWithReset = useCallback(() => {
    resetModal();
    onClose();
  }, [onClose, resetModal]);

  useEffect(() => {
    if (!isOpen) {
      resetModal();
    }
  }, [isOpen, resetModal]);

  useEffect(() => {
    if (!errorMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      closeWithReset();
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [errorMessage, closeWithReset]);

  const handleUpload = async (selectedFile) => {
    if (!selectedFile) {
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage("Можно загружать только PDF-файлы");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setLoading(true);
    setEmptyState(false);
    setTransactions([]);
    setStats(null);
    setErrorMessage("");

    try {
      const response = await api.post(
        "/imports/sber-preview",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 120000,
        }
      );

      const previewStats = response.data.stats;
      const previewTransactions = response.data.transactions || [];

      setStats(previewStats);

      if (previewTransactions.length === 0) {
        setEmptyState(true);
        setTransactions([]);
        return;
      }

      setTransactions(previewTransactions);
    } catch (err) {
      const timedOut = err.code === "ECONNABORTED";
      setErrorMessage(
        timedOut
          ? "Обработка заняла слишком много времени. Попробуйте ещё раз или проверьте логи сервера."
          : getApiErrorMessage(
              err,
              "Не удалось обработать выписку"
            )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    await handleUpload(selectedFile);
  };

  const handleSave = async () => {
    if (transactions.length === 0 || saving) {
      return;
    }

    setSaving(true);

    try {
      const response = await api.post(
        "/imports/save",
        transactions
      );

      const count = response.data?.count ?? transactions.length;

      setSavedCount(count);
      await onTransactionsImported?.();
      setSuccess(true);

      window.setTimeout(() => {
        closeWithReset();
      }, 1800);
    } catch (err) {
      setErrorMessage(
        getApiErrorMessage(
          err,
          "Не удалось сохранить операции"
        )
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  if (errorMessage) {
    return (
      <ModalPortal isOpen={isOpen}>
        <div
          ref={overlayRef}
          className="modal-overlay"
          onClick={handleOverlayClick}
        >
          <div
            className="import-modal import-modal--state"
            onClick={handleModalClick}
          >
            <div className="import-state-icon import-state-icon--error">
              <FiAlertCircle />
            </div>
            <h2>Не удалось загрузить выписку</h2>
            <p>{errorMessage}</p>
            <span className="import-state-hint">
              Окно закроется автоматически
            </span>
          </div>
        </div>
      </ModalPortal>
    );
  }

  if (success) {
    return (
      <ModalPortal isOpen={isOpen}>
        <div
          ref={overlayRef}
          className="modal-overlay"
          onClick={handleOverlayClick}
        >
          <div
            className="import-modal import-modal--state success-modal"
            onClick={handleModalClick}
          >
            <div className="import-state-icon import-state-icon--success">
              <FiCheckCircle />
            </div>
            <h2>Операции сохранены</h2>
            <p>
              Добавлено операций: <strong>{savedCount}</strong>
            </p>
            <span className="import-state-hint">
              Данные на странице уже обновлены
            </span>
          </div>
        </div>
      </ModalPortal>
    );
  }

  const showUploadZone =
    !loading
    && transactions.length === 0
    && !emptyState;

  return (
    <ModalPortal isOpen={isOpen}>
      <div
        ref={overlayRef}
        className="modal-overlay"
        onClick={handleOverlayClick}
      >
        <div
          className={`import-modal${loading || saving ? " import-modal--loading" : ""}`}
          onClick={handleModalClick}
        >
          <div className="import-header">
            <h2>Загрузить выписку банка</h2>

            {transactions.length > 0 && (
              <div className="save-wrapper">
                <button
                  type="button"
                  className="save-btn"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Сохранение..." : "Сохранить операции"}
                </button>
              </div>
            )}

            <button
              type="button"
              className="close-icon"
              onClick={closeWithReset}
              aria-label="Закрыть"
            >
              <FiX />
            </button>
          </div>

          {showUploadZone && (
            <label className="upload-zone">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                hidden
              />

              <FiUpload />

              <p>Загрузить PDF выписку</p>

              <span>
                {file
                  ? file.name
                  : "Нажмите или перетащите файл Сбербанка"}
              </span>
            </label>
          )}

          {(loading || saving) && (
            <div className="modal-loading-overlay">
              <Spinner
                size="lg"
                label={
                  saving
                    ? "Сохраняем операции..."
                    : "Читаем и обрабатываем выписку..."
                }
              />
            </div>
          )}

          {emptyState && stats && (
            <div className="import-empty-state">
              <div className="import-state-icon import-state-icon--empty">
                <FiInbox />
              </div>
              <h3>Новых операций нет</h3>
              <p>
                {stats.duplicates_skipped > 0
                  ? `В выписке ${stats.parsed_total} операций, но все они уже есть в кошельке.`
                  : "В этой выписке не нашлось операций для импорта."}
              </p>
              <button
                type="button"
                className="import-empty-action"
                onClick={() => {
                  setEmptyState(false);
                  setStats(null);
                  setFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              >
                <FiUpload />
                Загрузить другую выписку
              </button>
            </div>
          )}

          {transactions.length > 0 && (
            <>
              {stats?.duplicates_skipped > 0 && (
                <p className="import-preview-note">
                  <FiFileText />
                  Пропущено дубликатов: {stats.duplicates_skipped}
                </p>
              )}

              <div className="preview-list">
                {transactions.map((transaction, index) => (
                  <div
                    key={`${transaction.description}-${transaction.amount}-${index}`}
                    className="preview-item"
                  >
                    <div>
                      <strong>{transaction.category}</strong>

                      {transaction.bank_category && (
                        <small className="bank-category">
                          Банк: {transaction.bank_category}
                        </small>
                      )}

                      <p>{transaction.description}</p>
                    </div>

                    <div className="preview-amount">
                      {transaction.amount} ₽
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}

export default ImportStatementModal;

