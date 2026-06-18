const DETAIL_MESSAGES = {
  "Email already exists":
    "Пользователь с таким email уже существует",
  "Invalid credentials":
    "Неверный email или пароль",
  "Transfer ownership to another member before leaving the budget":
    "Сначала назначьте другого участника владельцем, затем вы сможете выйти",
  "Remove all members or transfer ownership before deleting the budget":
    "Удалите всех участников или передайте владение, прежде чем удалять семью",
  "Only PDF allowed":
    "Можно загружать только PDF-файлы",
  "Could not parse bank statement PDF":
    "Не удалось прочитать выписку. Проверьте, что это PDF-выписка Сбербанка",
  "No transactions found in statement":
    "В выписке не найдено операций",
};

const FIELD_MESSAGES = {
  email: "Укажите корректный email",
  last_name: "Укажите фамилию",
  first_name: "Укажите имя",
  middle_name: "Отчество слишком длинное",
  password: "Укажите пароль",
};

function validationItemMessage(item) {
  const field = item?.loc?.[item.loc.length - 1];
  if (field && FIELD_MESSAGES[field]) {
    return FIELD_MESSAGES[field];
  }
  return item?.msg || null;
}

export function getApiErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail;

  if (!detail) {
    return fallback;
  }

  if (typeof detail === "string") {
    return DETAIL_MESSAGES[detail] || detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map(validationItemMessage)
      .filter(Boolean);

    if (messages.length > 0) {
      return [...new Set(messages)].join(". ");
    }
  }

  return fallback;
}

export function isValidEmail(value) {
  const email = String(value || "").trim();
  if (!email) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
