import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { FiX } from "react-icons/fi";

import api from "../../api/api";
import useModal from "../../hooks/useModal";
import ModalPortal from "../shared/ModalPortal";
import TransactionListItem from "./TransactionListItem";
import TransactionDetailsModal from "./TransactionDetailsModal";
import {
  filterTransactions,
  sortTransactionsByDate,
} from "../../utils/transactionFilters";

import "../../styles/wallet/AllTransactionsModal.css";
import "../../styles/shared/TransactionList.css";

const PREVIEW_LIMIT = 4;
const LIST_CHUNK = 50;

function AllTransactionsModal({
  isOpen,
  onClose,
  transactions,
  onTransactionUpdated,
  initialTypeFilter = "all",
  isFamilyView = false,
}) {
  const {
    handleOverlayClick,
    handleModalClick,
    overlayRef,
  } = useModal({ isOpen, onClose });

  const [typeFilter, setTypeFilter] = useState(
    initialTypeFilter
  );
  const [categoryFilter, setCategoryFilter] =
    useState("");
  const [categories, setCategories] = useState([]);
  const [selectedTransaction, setSelectedTransaction] =
    useState(null);
  const [isDetailsOpen, setIsDetailsOpen] =
    useState(false);
  const [updateNotice, setUpdateNotice] =
    useState(null);
  const [visibleCount, setVisibleCount] =
    useState(LIST_CHUNK);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTypeFilter(initialTypeFilter);
    setCategoryFilter("");
    setVisibleCount(LIST_CHUNK);

    const loadCategories = async () => {
      try {
        const response = await api.get("/categories");
        setCategories(response.data);
      } catch (_) {
        setCategories([]);
      }
    };

    loadCategories();
  }, [
    isOpen,
    initialTypeFilter,
  ]);

  const categoryOptions = useMemo(() => {
    return categories.filter((category) => {
      if (typeFilter === "all") {
        return true;
      }

      return category.type === typeFilter;
    });
  }, [categories, typeFilter]);

  const filteredTransactions = useMemo(() => {
    const filtered = filterTransactions(
      transactions,
      {
        typeFilter,
        categoryId: categoryFilter
          ? Number(categoryFilter)
          : null,
      }
    );

    return sortTransactionsByDate(filtered);
  }, [
    transactions,
    typeFilter,
    categoryFilter,
  ]);

  useEffect(() => {
    setVisibleCount(LIST_CHUNK);
  }, [
    typeFilter,
    categoryFilter,
  ]);

  const visibleTransactions = useMemo(
    () =>
      filteredTransactions.slice(0, visibleCount),
    [filteredTransactions, visibleCount]
  );

  const hasMoreToLoad =
    visibleCount < filteredTransactions.length;

  const handleTypeChange = (nextType) => {
    setTypeFilter(nextType);
    setCategoryFilter("");
  };

  const handleTransactionClick = useCallback(
    (transaction) => {
      setSelectedTransaction(transaction);
      setIsDetailsOpen(true);
    },
    []
  );

  const closeDetailsModal = useCallback(() => {
    setIsDetailsOpen(false);
    setSelectedTransaction(null);
  }, []);

  return (
    <>
      <ModalPortal isOpen={isOpen}>
        <div
          ref={overlayRef}
          className="modal-overlay all-transactions-overlay"
          onClick={handleOverlayClick}
        >
        <div
          className="all-transactions-modal"
          onClick={handleModalClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="all-transactions-title"
        >
          <header className="all-transactions-header">
            <div>
              <h2 id="all-transactions-title">
                Все операции
              </h2>
              <p className="all-transactions-subtitle">
                Найдено: {filteredTransactions.length}
              </p>
            </div>

            <button
              type="button"
              className="all-transactions-close"
              onClick={onClose}
              aria-label="Закрыть"
            >
              <FiX />
            </button>
          </header>

          <div className="all-transactions-filters">
            <div className="type-filter-group">
              <button
                type="button"
                className={
                  typeFilter === "all"
                    ? "type-filter-btn active"
                    : "type-filter-btn"
                }
                onClick={() => handleTypeChange("all")}
              >
                Все
              </button>
              <button
                type="button"
                className={
                  typeFilter === "expense"
                    ? "type-filter-btn active"
                    : "type-filter-btn"
                }
                onClick={() =>
                  handleTypeChange("expense")
                }
              >
                Списания
              </button>
              <button
                type="button"
                className={
                  typeFilter === "income"
                    ? "type-filter-btn active"
                    : "type-filter-btn"
                }
                onClick={() =>
                  handleTypeChange("income")
                }
              >
                Пополнения
              </button>
            </div>

            <label className="all-transactions-category-filter">
              <span>Категория</span>
              <select
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value)
                }
              >
                <option value="">
                  Все категории
                </option>
                {categoryOptions.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                    {typeFilter === "all"
                      ? ` (${category.type === "income" ? "доход" : "расход"})`
                      : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {updateNotice && (
            <p className="transactions-notice">
              {updateNotice}
            </p>
          )}

          <div className="all-transactions-list">
            {filteredTransactions.length === 0 ? (
              <p className="empty-text">
                Нет операций по выбранным фильтрам
              </p>
            ) : (
              <>
                {visibleTransactions.map((transaction) => (
                  <TransactionListItem
                    key={transaction.id}
                    transaction={transaction}
                    isFamilyView={isFamilyView}
                    onClick={handleTransactionClick}
                  />
                ))}

                {hasMoreToLoad && (
                  <button
                    type="button"
                    className="all-transactions-load-more"
                    onClick={() =>
                      setVisibleCount(
                        (count) =>
                          count + LIST_CHUNK
                      )
                    }
                  >
                    Показать ещё (
                    {filteredTransactions.length -
                      visibleCount}{" "}
                    осталось)
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        </div>
      </ModalPortal>

      {isDetailsOpen && selectedTransaction && (
        <TransactionDetailsModal
          isOpen={isDetailsOpen}
          onClose={closeDetailsModal}
          transaction={selectedTransaction}
          onUpdated={(similarCount = 0) => {
            if (similarCount > 0) {
              setUpdateNotice(
                `Категория применена ещё к ${similarCount} похожим операциям`
              );

              window.setTimeout(
                () => setUpdateNotice(null),
                6000
              );
            }

            onTransactionUpdated();
          }}
        />
      )}
    </>
  );
}

export { PREVIEW_LIMIT };
export default AllTransactionsModal;
