## Персональный инвестиционный советник (Explainable AI)

Веб-приложение с прозрачным пошаговым объяснением инвестиционной логики:
`macro -> sector -> company -> final recommendation`.

## Стек

- Бэкенд: Python 3.12.6, Poetry, FastAPI, LangChain, LangGraph, OpenAI, FAISS, DuckDuckGo Search, yfinance, PostgreSQL, Redis, SQLAlchemy (async), Alembic, structlog.
- Фронтенд: React 18, TypeScript (strict), Vite, TanStack Query, Recharts, shadcn-style UI + Tailwind.

## Архитектура

Чистая архитектура из 4 слоёв:

- `app/domain`: сущности и абстрактные порты (ABC).
- `app/application`: use cases и контракты шлюзов.
- `app/infrastructure`: шлюзы, репозитории, кэш, векторное хранилище, конвейер LangGraph.
- `app/presentation`: роуты FastAPI и потоковая передача через SSE.

## Возможности

- Онбординг профиля через диалог (6 вопросов, извлекаются и парсятся LLM).
- Обновление профиля без повторного прохождения онбординга.
- LangGraph StateGraph (4 последовательных узла) и потоковое вещание шагов в реальном времени (SSE).
- RAG через FAISS для загруженных PDF, пространство имён по компаниям, параметры: `chunk_size=1000`, `chunk_overlap=200`, `retrieval_k=5`.
- Рыночные метрики из `yfinance` с TTL-кэшем в Redis (1 час).
- Ввод состава портфеля и учёт ребалансировки в контексте рекомендаций.
- История разговоров, поиск по сообщениям, история и детали рекомендаций.
- Образовательное предупреждение/дисклеймер в модели рекомендаций.

## Окружение

Скопируйте `.env.example` в `.env` и задайте значения переменных окружения:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (по умолчанию `gpt-4o`)
- `OPENAI_EMBEDDING_MODEL` (по умолчанию `text-embedding-3-small`)
- `DATABASE_URL`
- `REDIS_URL`
- `VECTOR_STORE_PATH`
- `MARKET_DATA_TTL_SEC`
- `MAX_CONVERSATION_HISTORY`
- `RETRIEVAL_K`
- `LOG_LEVEL`

## Запуск бэкенда

```bash
poetry install
docker compose up -d
poetry run alembic upgrade head
poetry run uvicorn app.main:app --reload
```

Документация API: `http://localhost:8000/docs`

## Запуск фронтенда

```bash
cd frontend
npm install
npm run dev
```

Откройте `http://localhost:5173`.

Необязательная переменная окружения для фронтенда:

- `VITE_API_BASE_URL=http://localhost:8000`

## Основные эндпоинты API

- `POST /api/users`
- `GET /api/users/{id}/profile`
- `PUT /api/users/{id}/profile`
- `POST /api/users/{id}/portfolio`
- `POST /api/conversations`
- `GET /api/conversations/{id}/messages`
- `POST /api/conversations/{id}/messages`
- `GET /api/conversations/{id}/stream` (SSE)
- `GET /api/recommendations`
- `GET /api/recommendations/{id}`
- `POST /api/documents`
- `GET /api/search/messages`

## Тесты

```bash
poetry run pytest
```

Текущие тесты покрывают доменные модели и ключевые контракты эндпоинтов на уровне smoke-тестов.
