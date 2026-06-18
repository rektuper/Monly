/** Recommendations and UI items that are for admins / internal QA only */
export function filterUserRecommendations(items, isAdmin = false) {
  if (!items?.length) {
    return [];
  }

  if (isAdmin) {
    return items;
  }

  return items.filter((item) => item.type !== "review");
}
