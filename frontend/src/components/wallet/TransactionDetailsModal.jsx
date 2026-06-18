import {
  useEffect,
  useState,
} from "react";

import {
  FiEdit2,
  FiSave,
  FiX,
} from "react-icons/fi";

import api from "../../api/api";
import useModal from "../../hooks/useModal";
import CategoryPicker from "./CategoryPicker";
import ModalPortal from "../shared/ModalPortal";
import { formatCurrency } from "../../utils/currency";

import "../../styles/shared/TransactionDetailsModal.css";

function mapTransactionForm(transaction) {
  return {
    category_id: transaction.category_id,
    description: transaction.description,
    amount: transaction.amount,
    type: transaction.type,
  };
}

function formatTransactionDate(value) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TransactionDetailsModal({
  isOpen,
  onClose,
  transaction,
  onUpdated,
  currency = "RUB",
}) {
  const isActive = Boolean(isOpen && transaction);

  const {
    handleOverlayClick: handleDetailsOverlayClick,
    overlayRef,
  } = useModal({ isOpen: isActive, onClose });

  const [isEditing, setIsEditing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState(() =>
    transaction ? mapTransactionForm(transaction) : null
  );

  useEffect(() => {
    if (!isOpen) return;

    const fetchCategories = async () => {
      try {
        const response = await api.get("/categories");
        setCategories(response.data);
      } catch (_) {}
    };

    fetchCategories();
  }, [isOpen]);

  useEffect(() => {
    if (transaction) {
      setFormData(mapTransactionForm(transaction));
      setIsEditing(false);
    }
  }, [transaction?.id, isOpen]);

  if (!isActive) {
    return null;
  }

  const isIncome = transaction.type === "income";
  const typeLabel = isIncome ? "Доход" : "Расход";

  const handleSave = async () => {
    if (!formData?.category_id) {
      return;
    }

    try {
      const response = await api.patch(
        `/transactions/${transaction.id}`,
        formData
      );

      const similarCount =
        response.data?.similar_updated_count ?? 0;

      setIsEditing(false);
      onUpdated(similarCount);
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  const handleCategoryCreated = (category) => {
    setCategories((prev) => {
      if (prev.some((item) => item.id === category.id)) {
        return prev;
      }

      return [...prev, category];
    });
  };

  return (
    <ModalPortal isOpen={isActive}>
      <div
        ref={overlayRef}
        className="modal-overlay transaction-details-overlay"
        onClick={handleDetailsOverlayClick}
      >
        <div
          className="transaction-modal"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="transaction-modal-title"
        >
          <header className="transaction-modal-header">
            <h2 id="transaction-modal-title">Транзакция</h2>

            <div className="transaction-modal-actions">
              {!isEditing && (
                <button
                  type="button"
                  className="transaction-icon-btn"
                  onClick={() => setIsEditing(true)}
                  aria-label="Редактировать"
                >
                  <FiEdit2 />
                </button>
              )}

              {isEditing && (
                <button
                  type="button"
                  className="transaction-icon-btn primary"
                  onClick={handleSave}
                  disabled={!formData?.category_id}
                  aria-label="Сохранить"
                >
                  <FiSave />
                </button>
              )}

              <button
                type="button"
                className="transaction-icon-btn"
                onClick={onClose}
                aria-label="Закрыть"
              >
                <FiX />
              </button>
            </div>
          </header>

          {!isEditing && (
            <div
              className={`transaction-hero${isIncome ? " income" : " expense"}`}
            >
              <span className="transaction-hero-amount">
                {isIncome ? "+" : "−"}
                {formatCurrency(transaction.amount, currency)}
              </span>
              <span className="transaction-hero-type">{typeLabel}</span>
            </div>
          )}

          <div className="transaction-modal-body">
            {isEditing ? (
              <div className="transaction-edit-form">
                <label className="transaction-field">
                  <span>Категория</span>
                  <CategoryPicker
                    categories={categories}
                    type={formData?.type || transaction.type}
                    categoryId={formData?.category_id}
                    onCategoryChange={(categoryId) =>
                      setFormData((prev) => ({
                        ...prev,
                        category_id: categoryId,
                      }))
                    }
                    onCategoryCreated={handleCategoryCreated}
                  />
                </label>

                <label className="transaction-field">
                  <span>Описание</span>
                  <textarea
                    value={formData?.description ?? ""}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        description: event.target.value,
                      })
                    }
                    placeholder="Необязательно"
                  />
                </label>

                <label className="transaction-field">
                  <span>Сумма</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData?.amount ?? ""}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        amount: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
            ) : (
              <dl className="transaction-details">
                <div className="transaction-detail">
                  <dt>Категория</dt>
                  <dd>{transaction.category?.name || "-"}</dd>
                </div>

                <div className="transaction-detail">
                  <dt>Дата</dt>
                  <dd>{formatTransactionDate(transaction.transaction_date)}</dd>
                </div>

                {transaction.description ? (
                  <div className="transaction-detail transaction-detail--full">
                    <dt>Описание</dt>
                    <dd>{transaction.description}</dd>
                  </div>
                ) : null}

                {transaction.payer?.name && (
                  <div className="transaction-detail">
                    <dt>Оплатил</dt>
                    <dd>{transaction.payer.name}</dd>
                  </div>
                )}

                {transaction.receiver?.name && (
                  <div className="transaction-detail">
                    <dt>Получатель</dt>
                    <dd>{transaction.receiver.name}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export default TransactionDetailsModal;
