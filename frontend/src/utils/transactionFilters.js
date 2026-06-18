export function sortTransactionsByDate(transactions) {
  return [...transactions].sort(
    (a, b) =>
      new Date(b.transaction_date).getTime() -
      new Date(a.transaction_date).getTime()
  );
}

export function filterTransactions(
  transactions,
  {
    typeFilter = "all",
    categoryId = null,
    showReviewOnly = false,
  } = {}
) {
  return transactions.filter((transaction) => {
    if (showReviewOnly && !transaction.needs_review) {
      return false;
    }

    if (
      typeFilter !== "all" &&
      transaction.type !== typeFilter
    ) {
      return false;
    }

    if (
      categoryId &&
      transaction.category_id !== categoryId
    ) {
      return false;
    }

    return true;
  });
}

export function formatAiConfidence(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return `${Math.round(value * 100)}%`;
}
