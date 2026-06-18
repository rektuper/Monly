import { memo, useCallback, useMemo, useState } from "react";

import { FiPlus, FiUpload, FiList } from "react-icons/fi";

import FeaturedSectionHeader from "../shared/FeaturedSectionHeader";



import TransactionDetailsModal from "./TransactionDetailsModal";

import TransactionListItem from "./TransactionListItem";

import AllTransactionsModal, {

  PREVIEW_LIMIT,

} from "./AllTransactionsModal";

import {

  filterTransactions,

  sortTransactionsByDate,

} from "../../utils/transactionFilters";



import "../../styles/shared/TransactionList.css";



function TransactionList({

  transactions,

  currency = "RUB",

  onAddTransaction,

  onImportStatement,

  onTransactionUpdated,

  compact = false,

  isFamilyView = false,

}) {

  const [selectedTransaction, setSelectedTransaction] =

    useState(null);

  const [isDetailsOpen, setIsDetailsOpen] =

    useState(false);

  const [isAllModalOpen, setIsAllModalOpen] =

    useState(false);

  const [typeFilter, setTypeFilter] = useState("all");

  const [updateNotice, setUpdateNotice] = useState(null);



  const filteredTransactions = useMemo(() => {

    const filtered = filterTransactions(transactions, {

      typeFilter,

    });



    return sortTransactionsByDate(filtered);

  }, [transactions, typeFilter]);



  const previewTransactions = useMemo(

    () => filteredTransactions.slice(0, PREVIEW_LIMIT),

    [filteredTransactions]

  );



  const hasMore =

    filteredTransactions.length > PREVIEW_LIMIT;



  const handleTransactionClick = useCallback(

    (transaction) => {

      setSelectedTransaction(transaction);

      setIsDetailsOpen(true);

    },

    []

  );



  const closeAllModal = useCallback(() => {

    setIsAllModalOpen(false);

  }, []);



  const closeDetailsModal = useCallback(() => {

    setIsDetailsOpen(false);

    setSelectedTransaction(null);

  }, []);



  return (

    <>

      <section

        className={`transactions-block${compact ? " transactions-block--compact" : ""}`}

      >

        <FeaturedSectionHeader
          icon={FiList}
          title="Последние операции"
          subtitle="Доходы и расходы"
          className="featured-card-header--wrap transactions-featured-header"
        >
          <div className="transaction-actions">
            <button
              type="button"
              onClick={onAddTransaction}
            >
              <FiPlus />
            </button>
            <button
              type="button"
              onClick={onImportStatement}
            >
              <FiUpload />
            </button>
          </div>
        </FeaturedSectionHeader>

        <div className="transactions-filters">
          <div className="type-filter-group">
            <button
              type="button"
              className={
                typeFilter === "all"
                  ? "type-filter-btn active"
                  : "type-filter-btn"
              }
              onClick={() => setTypeFilter("all")}
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
              onClick={() => setTypeFilter("expense")}
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
              onClick={() => setTypeFilter("income")}
            >
              Пополнения
            </button>
          </div>
        </div>



        {updateNotice && (

          <p className="transactions-notice">

            {updateNotice}

          </p>

        )}



        <div className="transactions-list transactions-list-preview">

          {previewTransactions.length === 0 ? (

            <p className="empty-text">

              {typeFilter === "income"

                ? "Пополнений пока нет"

                : typeFilter === "expense"

                  ? "Списаний пока нет"

                  : "Транзакций пока нет"}

            </p>

          ) : (

            previewTransactions.map((transaction) => (

              <TransactionListItem

                key={transaction.id}

                transaction={transaction}

                currency={currency}

                isFamilyView={isFamilyView}

                onClick={handleTransactionClick}

              />

            ))

          )}

        </div>



        {transactions.length > 0 && (

          <button

            type="button"

            className="show-all-transactions-btn"

            onClick={() => setIsAllModalOpen(true)}

          >

            {hasMore

              ? `Показать все (${filteredTransactions.length})`

              : "Показать все"}

          </button>

        )}

      </section>



      {isAllModalOpen && (

        <AllTransactionsModal

          isOpen={isAllModalOpen}

          onClose={closeAllModal}

          transactions={transactions}

          onTransactionUpdated={onTransactionUpdated}

          initialTypeFilter={typeFilter}

          isFamilyView={isFamilyView}

        />

      )}



      {isDetailsOpen && selectedTransaction && (

        <TransactionDetailsModal

          isOpen={isDetailsOpen}

          onClose={closeDetailsModal}

          transaction={selectedTransaction}

          onUpdated={(similarCount = 0) => {

            if (similarCount > 0) {

              setUpdateNotice(

                `Категория обновлена для ${similarCount} похожих операций`

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



export default memo(TransactionList);

