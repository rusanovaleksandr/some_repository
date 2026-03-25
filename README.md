# mse-template

## Запуск через Docker

### Требования
- Docker
- Docker Compose (плагин `docker compose`)

### Быстрый старт
Из корня проекта выполните:

```bash
docker compose up --build -d
```

После запуска:
- Фронтенд: `http://localhost:3000`
- Бэкенд (FastAPI): `http://localhost:8000`
- PostgreSQL: внутри docker-сети (`db:5432`)

Остановить проект:

```bash
docker compose down
```

Остановить проект и удалить тома БД/хранилища:

```bash
docker compose down -v
```

## Переменные окружения (опционально)

Можно создать файл `.env` в корне проекта, чтобы переопределить значения по умолчанию:

```env
POSTGRES_DB=eduprogram
POSTGRES_USER=eduprogram
POSTGRES_PASSWORD=eduprogram_pass

REACT_APP_API_URL=localhost:8000
REACT_APP_API_URL_ADD_PROGRAM=localhost:8000
REACT_APP_API_URL_GET_PROGRAMMS=localhost:8000
```

Если `.env` не задан, `docker-compose.yml` использует безопасные значения по умолчанию.

## Проверка работоспособности
- Откройте `http://localhost:3000` и проверьте доступность интерфейса.
- Выполните регистрацию/вход через UI.
- Убедитесь, что запросы к API проходят на `http://localhost:8000`.

## Что добавлено для контейнеризации
- `docker-compose.yml` — оркестрация `frontend`, `backend`, `db`
- `backend/Dockerfile` — контейнер FastAPI
- `frontend/Dockerfile` + `frontend/nginx.conf` — production-сборка React и раздача через Nginx
- `.dockerignore` — ускорение сборки и уменьшение контекста
