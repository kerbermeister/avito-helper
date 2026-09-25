# Avito Helper

Личный каталог вещей → подготовка объявлений для Авито. Веб-приложение (iPhone + Mac) на Java/Spring Boot + React.

## Быстрый старт (одна команда)

Нужен только Docker.

```bash
docker compose up --build
```

Открой http://localhost:5173 и войди: **admin@example.com** / **change-me**
(учётка создаётся автоматически при первом старте).

Остановить — `Ctrl+C`. Стереть данные — `docker compose down -v`.

### С голосовым вводом (опционально)

```bash
docker compose --profile voice up --build
```

Голос (faster-whisper) при первом запуске скачивает модель — займёт пару минут.

## Что умеет приложение

- Создание объявления: название, описание, цена, категория (опционально).
- Фото: до 12 штук — из галереи или с камеры.
- Голосовой ввод названия / описания / цены (при поднятом STT).
- Статусы: черновик → готово → размещено → продано (+ архив, отменено).
- Скачивание всех фото объявления одним ZIP-архивом.

## Режим разработки (hot-reload)

Для активной разработки фронта с мгновенной перезагрузкой:

```bash
# 1. Postgres
docker compose up -d postgres

# 2. Бэкенд (или запускай прямо из IntelliJ)
mvn -pl backend spring-boot:run

# 3. Фронтенд
cd frontend && npm install && npm run dev
```

Фронт — http://localhost:5173 (проксирует `/api` на `localhost:8080`).
Swagger API — http://localhost:8080/swagger-ui.html

## Стек

| Слой | Технология |
|---|---|
| Backend | Java 25, Spring Boot 4.1, Maven, Liquibase (XML changelog) |
| БД | PostgreSQL 18 |
| Файлы | Локальное хранилище (Docker-том) или S3-совместимое (R2 / Yandex / Garage) |
| Голос | faster-whisper (отдельный контейнер) |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 4 |
| Деплой | Docker Compose + Caddy (HTTPS) + GitHub Actions |

## Структура

```
pom.xml               корневой Maven-проект (агрегатор, parent — Spring Boot)
backend/              Spring Boot REST API (Maven-модуль)
frontend/             React SPA
stt/                  faster-whisper (распознавание голоса)
deploy/               docker-compose + Caddyfile для продакшена
docker-compose.yml    локальный запуск (Postgres + backend + frontend + stt)
.github/              CI/CD пайплайн
```

## Открытие в IntelliJ IDEA

File → Open → корень `avito-helper`. IDEA увидит корневой `pom.xml` и импортирует модуль `backend`.

## Продакшен-деплой

`deploy/` содержит docker-compose с Caddy (авто-HTTPS) и GitHub Actions-пайплайн.
Настраивается позже — секреты в `deploy/.env.example`.
