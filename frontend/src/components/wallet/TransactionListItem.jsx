import { memo } from "react";

import UserAvatar from "../shared/UserAvatar";
import { formatCurrency } from "../../utils/currency";

function TransactionListItem({
  transaction,
  onClick,
  currency = "RUB",
  isFamilyView = false,
}) {
  const participant =
    transaction.type === "income"
      ? transaction.receiver
      : transaction.payer;

  const participantLabel =
    transaction.type === "income"
      ? "Получатель"
      : "Оплатил";

  const displayPerson = isFamilyView
    ? (transaction.created_by?.name
        ? transaction.created_by
        : participant)
    : null;

  const dateText = new Date(
    transaction.transaction_date
  ).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <article
      className="transaction-item clickable"
      onClick={() => onClick(transaction)}
    >
      <div className="transaction-main">
        <div className="transaction-row transaction-row-top">
          <h3 className="transaction-category">
            {transaction.category?.name}
          </h3>

          <div
            className={
              transaction.type === "income"
                ? "amount income"
                : "amount expense"
            }
          >
            {transaction.type === "income" ? "+" : "-"}
            {formatCurrency(transaction.amount, currency)}
          </div>
        </div>

        <div className="transaction-row transaction-row-bottom">
          <div className="transaction-meta">
            {isFamilyView && displayPerson?.name ? (
              <span className="transaction-participant transaction-participant--with-avatar">
                <UserAvatar
                  name={displayPerson.name}
                  avatarUrl={displayPerson.avatar_url}
                  size={22}
                  className="transaction-participant-avatar"
                />
                <span className="transaction-participant-name">
                  {displayPerson.name}
                </span>
              </span>
            ) : (
              participant?.name && (
                <span className="transaction-participant">
                  {participantLabel}: {participant.name}
                </span>
              )
            )}
          </div>

          <time className="transaction-date" dateTime={transaction.transaction_date}>
            {dateText}
          </time>
        </div>
      </div>
    </article>
  );
}

export default memo(TransactionListItem);
