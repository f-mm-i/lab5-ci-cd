# Лабораторная работа №5 — Docker (микросервисная архитектура)

**Тема:** Реализация архитектуры на основе сервисов (микросервисной архитектуры)  
**Цель:** получить опыт организации взаимодействия сервисов с использованием контейнеров Docker.  
**Проект:** Mental Maps

---

## 1) Контейнеры и взаимодействие

Минимум 3 контейнера:

1. **frontend** (Nginx + UI)  
   - отдаёт страницу: `http://localhost:8080`  
   - проксирует `/api/*` в **backend**

2. **backend** (Node.js + Express REST API)  
   - слушает `:3000`  
   - использует **db** (PostgreSQL)  
   - endpoint здоровья: `/api/v1/health`

3. **db** (PostgreSQL)  
   - инициализация схемы и тестовых пользователей: `db/init.sql`

---

## 2) Запуск локально

### Быстрый старт

```bash
docker compose up --build
```

Эта команда:
- Соберёт образы для всех сервисов (frontend, backend, db)
- Запустит все контейнеры в правильном порядке (db → backend → frontend)
- Подождёт, пока база данных станет здоровой, перед запуском backend
- Подождёт, пока backend станет здоровым, перед запуском frontend

### Запуск в фоновом режиме

```bash
docker compose up --build -d
```

### Остановка сервисов

```bash
docker compose down
```

### Остановка с удалением volumes (очистка данных БД)

```bash
docker compose down -v
```

### Просмотр логов

```bash
# Все сервисы
docker compose logs -f

# Конкретный сервис
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

### Проверка работы

После запуска проверьте:
- **UI**: http://localhost:8080
- **API Health Check**: http://localhost:3000/api/v1/health
- **API через Nginx**: http://localhost:8080/api/v1/health

### Токены для тестирования

Для UI/Postman используйте:
- `user_777`
- `moderator_1`

---

## 3) Интеграционные тесты

Запуск через Newman (контейнер в CI-конфиге):

```bash
docker compose -f docker-compose.yml -f docker-compose.ci.yml run --rm newman
```

Коллекция: `tests/postman_collection.json`

---

## 4) CI (сборка образов + интеграционные тесты)

Workflow: `.github/workflows/ci.yml`

Что делает:
- поднимает сервисы через Docker Compose
- запускает Newman-тесты
- останавливает сервисы

---
