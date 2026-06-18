# Монли

Интеллектуальная система управления личным и семейным бюджетом.

Фронтенд на **React 19**, **Vite 8**, **React Router 7** и **Recharts**.  
Бэкенд — **FastAPI** (Python 3.11) с **PostgreSQL 16**, JWT-авторизацией и модулем ИИ для категоризации транзакций.

## Возможности

- Регистрация с подтверждением email (OTP), вход по JWT, сброс и смена пароля
- Учёт доходов и расходов, баланс, категории, редактирование и мягкое удаление операций
- Импорт выписок: PDF Сбербанка и CSV
- Автоматическая категоризация транзакций (правила + ML на `sentence-transformers`)
- Очередь операций «требует проверки» при низкой уверенности ИИ
- Аналитика: тренды, топ расходов, графики по категориям и дням недели
- Финансовые цели и месячные лимиты по категориям
- Персональные рекомендации и прогноз баланса
- Семейный бюджет: роли (владелец, участник, наблюдатель), приглашения по ссылке и коду
- Профиль пользователя с аватаром
- Панель администратора: статистика, обучение модели, массовая перекатегоризация
- Встроенная справка

## Стек

| Категория | Технологии |
|-----------|------------|
| Frontend | React 19, Vite 8, React Router 7 |
| UI / графики | CSS, Recharts, React Icons |
| HTTP | Axios |
| Backend | FastAPI, Uvicorn, SQLAlchemy |
| База данных | PostgreSQL 16 |
| Авторизация | JWT (`python-jose`), Argon2 |
| ИИ / ML | PyTorch (CPU), sentence-transformers, scikit-learn, rapidfuzz |
| Импорт | pdfplumber (PDF), pandas (CSV) |
| Почта | SMTP (регистрация, смена пароля, восстановление) |
| Production | Nginx (SPA + reverse proxy) |
| Контейнеризация | Docker Compose |

## Требования

- **Docker** и **Docker Compose** (v2)
- Запущенный **Docker Desktop** (на Windows — демон должен быть активен; иначе ошибка `dockerDesktopLinuxEngine: The system cannot find the file specified`)

Для локальной разработки без Docker дополнительно нужны **Node.js 20+**, **Python 3.11** и **PostgreSQL 16**.

## Запуск через Docker

Приложение состоит из трёх сервисов:

| Сервис | Описание | Порт |
|--------|----------|------|
| `db` | PostgreSQL 16 | внутренний |
| `backend` | FastAPI API | внутренний `:8000` |
| `web` | Nginx + собранный React | `127.0.0.1:3001` |

Схема запросов:

```
Браузер → web:80 (localhost:3001)
  /api/*     → backend:8000
  /uploads/* → backend:8000/uploads/
  /*         → SPA (index.html)
```

### 1. Настроить переменные окружения

В корне проекта создайте файл `.env` (шаблон — `backend/.env.example`):

```env
# Обязательные
DB_PASSWORD=your_strong_password
SECRET_KEY=your_long_random_secret_key

# База данных (значения по умолчанию)
DB_USER=budget_user
DB_NAME=smart_budget

# URL фронтенда для CORS и ссылок в письмах
ALLOWED_ORIGINS=http://localhost:3001
FRONTEND_URL=http://localhost:3001

# JWT
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Почта (нужна для регистрации, смены и сброса пароля)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASSWORD=app_password
SMTP_FROM=noreply@example.com
SMTP_FROM_NAME=МОНЛИ
SMTP_USE_TLS=true
SMTP_USE_SSL=false

# Опционально
VERIFICATION_CODE_EXPIRE_MINUTES=15
PASSWORD_RESET_EXPIRE_MINUTES=60
ENABLE_ML_CATEGORIZATION=true
```

| Переменная | Описание |
|------------|----------|
| `DB_PASSWORD` | Пароль PostgreSQL (**обязательно**) |
| `SECRET_KEY` | Секрет для подписи JWT (**обязательно**) |
| `DB_USER`, `DB_NAME` | Пользователь и имя БД (по умолчанию `budget_user`, `smart_budget`) |
| `ALLOWED_ORIGINS` | Разрешённые origin для CORS (через запятую) |
| `FRONTEND_URL` | Базовый URL фронтенда — используется в ссылках приглашений и писем |
| `SMTP_*` | Настройки почтового сервера |
| `ENABLE_ML_CATEGORIZATION` | Включить ML-категоризацию (`true` / `false`) |

### 2. Собрать и запустить

```bash
docker compose up -d --build
```

Первый запуск может занять несколько минут: скачиваются образы, устанавливаются зависимости Python (включая PyTorch CPU) и собирается фронтенд.

### 3. Открыть приложение

[http://localhost:3001](http://localhost:3001)

### 4. Полезные команды

```bash
# Статус контейнеров
docker compose ps

# Логи всех сервисов
docker compose logs -f

# Логи только бэкенда
docker compose logs -f backend

# Остановить
docker compose down

# Остановить и удалить данные БД (осторожно!)
docker compose down -v
```

### 5. Документация API

При работающем бэкенде доступна автодокументация FastAPI:

- Swagger UI: `http://localhost:3001/api/docs` (через Nginx-прокси — если настроен маршрут)
- Напрямую к контейнеру backend: `docker compose exec backend curl http://localhost:8000/docs`

> В Docker-сборке фронтенд обращается к API по относительному пути `/api`. Nginx проксирует запросы на сервис `backend`.

### Тома Docker

| Том | Назначение |
|-----|------------|
| `pgdata` | Данные PostgreSQL |
| `uploads` | Аватары пользователей |
| `model_cache` | Кэш pip и загруженных ML-моделей |

## Локальная разработка (без Docker)

### Бэкенд

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate

pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt

cp .env.example .env
# Отредактируйте .env: DB_HOST=127.0.0.1, SECRET_KEY, DB_PASSWORD и т.д.

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

При старте автоматически создаются таблицы (`create_all`) и применяются инкрементальные миграции (`core/db_migrate.py`). Alembic не используется.

### Фронтенд

```bash
cd frontend
npm ci
cp .env.example .env
```

Пример `.env` для локальной разработки:

```env
VITE_API_URL=http://127.0.0.1:8000
# VITE_MEDIA_URL=http://127.0.0.1:8000
```

```bash
npm run dev
```

Откройте [http://localhost:5173](http://localhost:5173).

## Скрипты (frontend)

| Команда | Описание |
|---------|----------|
| `npm run dev` | Режим разработки (Vite, порт 5173) |
| `npm run build` | Production-сборка |
| `npm run preview` | Просмотр собранного приложения |
| `npm run lint` | ESLint |

Бэкенд запускается через `uvicorn`, отдельных npm-скриптов нет.

## API

Базовый URL:

- **Docker:** `http://localhost:3001/api`
- **Локально:** `http://127.0.0.1:8000`

### Основные группы эндпоинтов

| Префикс | Назначение |
|---------|------------|
| `/auth` | Регистрация, вход, профиль JWT, смена и сброс пароля |
| `/profile` | Профиль, аватар |
| `/transactions` | Операции (CRUD, исправление категорий) |
| `/categories` | Пользовательские категории |
| `/imports` | Импорт PDF Сбербанка и CSV |
| `/analytics` | Аналитика по категориям |
| `/ai` | Предпросмотр категоризации |
| `/recommendations` | Рекомендации и прогноз |
| `/goals` | Финансовые цели и бюджеты по категориям |
| `/families` | Семейные бюджеты, приглашения, участники |
| `/admin` | Панель администратора (роль `admin`) |
| `/uploads` | Статические файлы (аватары) |

### Маршруты фронтенда

| Путь | Доступ |
|------|--------|
| `/` | Главная |
| `/login`, `/register`, `/reset-password` | Авторизация |
| `/dashboard`, `/wallet`, `/analytics`, `/recommendations` | Авторизованные |
| `/settings`, `/help`, `/family` | Авторизованные |
| `/admin` | Только `admin` |
| `/family/join/:token`, `/family/join-code/:code` | Приглашения в семью |

## Структура проекта

```
planner/
├── docker-compose.yml       # Оркестрация db + backend + web
├── .env                     # Переменные для Docker Compose (не в git)
│
├── backend/
│   ├── main.py              # Точка входа FastAPI
│   ├── database.py          # SQLAlchemy
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── core/                # Безопасность, зависимости, миграции
│   ├── models/              # ORM-модели
│   ├── schemas/             # Pydantic-схемы
│   ├── routers/             # API-маршруты
│   ├── services/            # Бизнес-логика, почта, семья
│   ├── parsers/             # Парсер PDF Сбербанка
│   ├── ai/                  # Категоризация, рекомендации, прогноз
│   └── uploads/             # Аватары (том в Docker)
│
└── frontend/
    ├── Dockerfile           # Сборка + Nginx
    ├── nginx.conf           # Прокси /api и /uploads
    ├── package.json
    └── src/
        ├── App.jsx          # Маршруты React Router
        ├── api/             # Axios-клиент
        ├── context/         # AuthContext
        ├── pages/           # Страницы
        ├── components/      # UI-компоненты
        ├── styles/          # CSS
        ├── utils/           # Утилиты
        └── data/            # Статьи справки
```

## ИИ-модуль

- **Категоризация:** правила по мерчантам + ML-модель на эмбеддингах (`paraphrase-multilingual-MiniLM-L12-v2`)
- При первом запуске модель скачивается автоматически (кэшируется в томе `model_cache`)
- Пользовательские исправления категорий сохраняются в `feedback.json` и используются при дообучении
- Администратор может объединить feedback, переобучить модель и перекатегоризировать ожидающие операции через `/admin`

Отключить ML: `ENABLE_ML_CATEGORIZATION=false` в `.env`.

## Администратор

Демо-пользователи не создаются автоматически. Чтобы назначить роль `admin`:

1. Зарегистрируйте пользователя через интерфейс
2. В PostgreSQL выполните: `UPDATE users SET role = 'admin' WHERE email = 'your@email.com';`

Или используйте панель `/admin`, если у вас уже есть администратор.

## Начальные данные

При регистрации каждому пользователю создаются категории по умолчанию:

**Расходы:** Продукты, Транспорт, Кафе, Развлечения, Подписки, Одежда, Здоровье  
**Доходы:** Пополнение, Зарплата, Фриланс, Подарок, Возврат

Обучающий датасет для ML лежит в `backend/ai/categorization/training/dataset.json`.

## Важные замечания

- **SMTP обязателен** для регистрации с подтверждением email, смены пароля и восстановления доступа. Без настроенной почты эти сценарии вернут ошибку 503.
- **Не коммитьте** `.env` — файл содержит секреты. Используйте `backend/.env.example` как шаблон.
- Лимиты загрузки: PDF до 10 МБ, аватары до 5 МБ (`client_max_body_size 10M` в Nginx).
- Интерфейс и сообщения API — на русском языке.
- При ошибке `dockerDesktopLinuxEngine` на Windows убедитесь, что **Docker Desktop запущен** и демон в состоянии *Running*, затем повторите `docker compose up -d --build`.
