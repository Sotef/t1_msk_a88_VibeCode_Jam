# Interview Platform (русская документация)

AI‑симулятор технических интервью: фронтенд на **Next.js/React**, бэкенд на **FastAPI**, интеграция с LLM‑платформой **Scibox**, хранение данных в **PostgreSQL** и запуск решений в изолированных Docker‑контейнерах. Ниже собраны инструкции по развёртыванию, настройке и использованию.

---

## Архитектура

| Компонент | Технологии | Назначение |
|-----------|------------|------------|
| **Фронтенд** | Next.js 16, React 19 | Интерфейс кандидата (страница `/`) и админ‑панель (`/admin`). Общение с бэкендом через REST/SSE. |
| **Бэкенд** | FastAPI, Pydantic, SQLAlchemy | API интервью, прокси к Scibox, анти‑чит, управление запуском кода. |
| **База данных** | PostgreSQL 16 | Хранение интервью, заданий, сообщений чата, админов и событий анти‑чита. |
| **Redis 7** | Подготовлен для кэша/сессий (в текущей конфигурации опционален). |
| **Docker‑раннер** | Внутри контейнера backend запускаются `python:3.11-slim`, `node:20-slim`, `gcc:13` для проверки решений. |

Структура репозитория:

- `app/` — Next.js проект (кандидат и админка).
- `components/` — UI‑компоненты, редактор, панели задач/чата.
- `backend/app/` — Код FastAPI: `routers`, `services`, `models`.
- `backend/alembic/` — миграции базы.
- `docker-compose.yml` — описание всех сервисов (frontend, backend, postgres, redis).

---

## Требования

1. Docker и Docker Compose (версия 2+).
2. (Опционально) Python 3.11 и Node.js 20 для локальной разработки.
3. **Рабочий Scibox API key** — без него любые вызовы LLM (генерация задач, чат, оценка решений, финальный отчёт) вернут `401 Unauthorized`, что приведёт к ошибкам 500 на фронтенде.

---

## Конфигурация окружения

Все настройки бэкенда описаны в `backend/app/config.py` (класс `Settings`). Значения берутся из `backend/.env`.  
Создайте файл `backend/.env` (не коммитится) из шаблона `backend/env.template` и заполните:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/interview_db
SCIBOX_API_KEY=sk-uh55w42lHCu9slecY8lT2w
SCIBOX_BASE_URL=https://llm.t1v.scibox.tech/v1
SECRET_KEY=<секрет для JWT>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REDIS_URL=redis://redis:6379/0
DOCKER_TIMEOUT=10
DOCKER_MEMORY_LIMIT=128m
DOCKER_CPU_LIMIT=0.8
MODEL_CHAT=qwen3-32b-awq
MODEL_CODER=qwen3-coder-30b-a3b-instruct-fp8
MODEL_EMBEDDING=bge-m3
SUPERADMIN_USERNAME=superadmin
SUPERADMIN_PASSWORD=superadmin123
SUPERADMIN_EMAIL=superadmin@example.com
DEFAULT_TASK_LANGUAGE=ru
```

> **Важно для продакшена:** измените `SUPERADMIN_PASSWORD` и `SECRET_KEY` на безопасные значения!

> **Важно:** после изменения `.env` перезапустите backend (`docker compose up --build`), иначе новые значения не подхватятся.

Фронтенд использует переменную `NEXT_PUBLIC_API_URL` (по умолчанию `http://localhost:8000`). При необходимости создайте `app/.env.local` и пропишите иной адрес.

---

## Запуск

### Быстрый старт (Docker Compose)

```bash
docker compose up --build
```

Запустятся четыре контейнера:

- `postgres` — доступен на `localhost:5432`;
- `redis` — во внутренней сети compose;
- `backend` — `http://localhost:8000`;
- `frontend` — `http://localhost:3000`.

Остановить все сервисы: `docker compose down`.  
Логи: `docker compose logs -f backend` (или `frontend`).

### Локальный запуск (опционально)

1. `cd backend && poetry install && poetry run alembic upgrade head`
2. `poetry run uvicorn app.main:app --reload`
3. `cd app && pnpm install && pnpm dev`

---

## Создание администратора и вход в админку

### Автоматическое создание суперадмина

При первом запуске backend автоматически создаётся суперадмин с учётными данными из `.env`:
- **Логин:** `SUPERADMIN_USERNAME` (по умолчанию `superadmin`)
- **Пароль:** `SUPERADMIN_PASSWORD` (по умолчанию `superadmin123`)
- **Email:** `SUPERADMIN_EMAIL` (по умолчанию `superadmin@example.com`)

Если суперадмин уже существует, система синхронизирует его пароль с `SUPERADMIN_PASSWORD` при каждой попытке входа, что позволяет обновить пароль через `.env`.

### Создание дополнительных админов

1. Убедитесь, что сервисы работают.
2. Создайте админа через REST‑эндпоинт (ключ `admin_key = super-secret-admin-key`):
   ```powershell
   Invoke-WebRequest `
     -Uri "http://localhost:8000/api/admin/register?username=admin&email=admin@example.com&password=Adm1nPass!&admin_key=super-secret-admin-key" `
     -Method POST
   ```
   Если запрос вернулся с 500 (часто из‑за ошибки Scibox в параллельном запросе), запись не создастся. Альтернатива — добавить запись напрямую в Postgres, предварительно сгенерировав bcrypt‑хэш так же, как в `backend/app/services/auth.py`.
3. Проверка логина:
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:8000/api/admin/login?username=superadmin&password=superadmin123" -Method POST
   ```
4. Открыть админ‑панель: `http://localhost:3000/admin`, ввести логин/пароль. Успешный вход сохранит `admin_token` в `localStorage`, далее фронт сам обращается к `GET /api/admin/dashboard`, `/api/admin/interviews`, `/api/admin/interviews/{id}` и т.д.

### Функции админ‑панели

- **Дашборд:** статистика по интервью, средние оценки, подозрительные активности
- **Список интервью:** фильтрация по статусу, просмотр деталей каждого интервью
- **Банк задач:** загрузка задач из CSV/JSON/XLSX, добавление вручную, экспорт, удаление
- **Детали интервью:** полная информация о кандидате, задачах, чате, метриках античита

---

## Пользовательский сценарий (интервью для кандидата)

1. **Старт:** `POST /api/interview/start` — создаётся запись `Interview`, возвращаются `interview_id`, `total_tasks`, выбранное направление/язык/сложность/язык задач (`task_language`: `ru`/`en`). Можно выбрать использование банка задач (`use_task_bank: true`).
2. **Получение задания:** `POST /api/interview/generate-task`:
   - Если `use_task_bank = true`: система выбирает задачу из банка на основе направления и сложности, исключая уже использованные и переиспользованные (>10 раз). Если подходящих задач нет, генерируется новая через LLM.
   - Если `use_task_bank = false`: backend вызывает LLM (`scibox_client.generate_task`), сохраняет `InterviewTask`.
   - **Адаптивная сложность:** количество задач динамически меняется (4-8) в зависимости от производительности кандидата:
     - Если средний балл > 80% → уменьшается до минимума (4 задачи)
     - Если средний балл < 40% → увеличивается до максимума (8 задач)
3. **Работа с задачей:**
   - **«Тесты»** → `POST /api/interview/run-tests`: backend поднимает Docker‑контейнер (python/node/c++), запускает видимые тесты и возвращает `ExecutionResult`. Увеличивается счётчик `test_runs`. Тесты автоматически прерываются при превышении лимитов времени/памяти/CPU.
   - **«Отправить»** → `POST /api/interview/submit-code`: для алгоритмических задач выполняется код, затем `scibox_client.evaluate_code` формирует оценку (score, feedback, strengths/improvements). Параллельно `anti_cheat_service.analyze_code_submission` анализирует решение. Увеличивается счётчик `submission_attempts`, отслеживаются `compilation_errors` и `execution_errors`.
   - **«Подсказка»** → `POST /api/interview/hint`: увеличивается счётчик подсказок, Scibox присылает текст (максимум 3 на задачу). Ответы на языке, выбранном при старте интервью.
   - **Чат** → `POST /api/interview/chat`: backend сохраняет сообщение пользователя и стримит ответ LLM через Server‑Sent Events (`data: ...`, `data: [DONE]`), после завершения запись попадает в `chat_messages`. Ответы на языке, выбранном при старте интервью.
4. **Переход к следующей задаче:** вызов `nextTask()` на фронте инициирует новый `generate-task` с учётом адаптивной сложности.  
5. **Завершение интервью:** `POST /api/interview/finish` — backend собирает все ответы, историю чатов, метрики античита, вызывает `scibox_client.generate_final_assessment`, сохраняет итоговые баллы/рекомендации и агрегированные метрики в таблицу `anti_cheat_metrics`. Фронт затем делает `GET /api/interview/feedback/{interview_id}` и отображает отчёт.

> Все перечисленные шаги зависят от корректной работы Scibox. При отсутствии токена или неверном `SCIBOX_BASE_URL` каждый вызов `scibox_client.*` завершится `HTTPStatusError 401`, а конечная точка API отдаст 500. При ошибке авторизации Scibox backend автоматически останавливается (`_fatal_shutdown`).

### Банк задач

Администратор может загружать задачи в банк через админ‑панель:
- **Форматы загрузки:** CSV, JSON, XLSX (массовая загрузка) или добавление одной задачи вручную
- **Обязательные поля:** условие задачи (`description`), сложность (`difficulty`), тип задачи (`task_type`), направление (`direction`)
- **Опциональные поля:** название, примеры, ограничения, тест‑кейсы, стартовый код, ожидаемое решение, тема, теги, язык программирования
- **Эмбеддинги:** при добавлении задачи автоматически генерируется эмбеддинг через Scibox (`bge-m3`) для семантического поиска
- **Экспорт:** задачи можно экспортировать в CSV, JSON или XLSX (все или выбранные)
- **Использование:** при выборе `use_task_bank = true` система подбирает задачи из банка, исключая уже использованные и переиспользованные (>10 раз)

#### Форматы файлов для загрузки задач

**JSON формат:**
```json
[
  {
    "title": "Название задачи",
    "description": "Подробное условие задачи",
    "task_type": "algorithm",
    "difficulty": "medium",
    "direction": "backend",
    "examples": [{"input": "1, 2, 3", "output": "6", "explanation": "Сумма"}],
    "constraints": ["Временная сложность O(n)", "Пространственная сложность O(1)"],
    "test_cases": [{"input": [1, 2, 3], "expected": 6}, {"input": [], "expected": 0}],
    "starter_code": {"python": "def solution():\n    pass", "javascript": "function solution() {}"},
    "expected_solution": "Опциональное решение",
    "topic": "массивы",
    "tags": ["массивы", "сортировка", "O(n log n)"],
    "language": "python"
  }
]
```

**CSV формат:**
Колонки: `title`, `description`, `task_type`, `difficulty`, `direction`, `examples`, `constraints`, `test_cases`, `starter_code`, `topic`, `tags`, `language`

JSON-поля (`examples`, `constraints`, `test_cases`, `starter_code`, `tags`) должны быть в виде JSON-строк:
```csv
title,description,task_type,difficulty,direction,examples,constraints,test_cases,starter_code,topic,tags,language
"Задача 1","Описание задачи","algorithm","medium","backend","[{\"input\":\"1,2,3\",\"output\":\"6\"}]","[\"O(n)\"]","[{\"input\":[1,2,3],\"expected\":6}]","{\"python\":\"def solution():\\n    pass\"}","массивы","[\"массивы\",\"сортировка\"]","python"
```

**XLSX формат:**
Та же структура, что и CSV, но в формате Excel. Первая строка — заголовки, последующие — данные.

**Допустимые значения:**
- `task_type`: `algorithm`, `system_design`, `code_review`, `debugging`, `practical`
- `difficulty`: `easy`, `medium`, `hard`
- `direction`: `frontend`, `backend`, `fullstack`, `data_science`, `devops`
- `language`: `python`, `javascript`, `cpp` (опционально)

---

## Частые проблемы и решения

| Симптом | Возможная причина / действия |
|---------|-----------------------------|
| `httpx.HTTPStatusError: 401 Unauthorized` | Неверный `SCIBOX_API_KEY` или `SCIBOX_BASE_URL`. Проверьте `backend/.env`, перезапустите backend. При ошибке 401 backend автоматически останавливается (`_fatal_shutdown`). |
| `[code-executor] Docker unavailable: Error while fetching server API version: Not supported URL scheme http+docker` | Docker URL схема автоматически нормализуется к `unix://var/run/docker.sock`. Если ошибка сохраняется, проверьте доступ к Docker socket в `docker-compose.yml` (volume `/var/run/docker.sock`). Система автоматически переключается на `docker-cli` fallback. |
| `sqlalchemy.exc.DBAPIError: asyncpg.exceptions.*` | Все DB операции обёрнуты в `try-except` с логированием. Проверьте логи backend для деталей. Возможные причины: несоответствие схемы БД (примените миграции: `alembic upgrade head`), проблемы с подключением к PostgreSQL, некорректные данные (например, неверный формат enum). |
| `/api/interview/finish` возвращает 500 | Чаще всего LLM вернул ошибку (см. логи). Иногда причина — отсутствие доступа к Docker‑сокету и невозможность выполнить код. Проверьте логи backend для детальной информации. |
| Регистрация админа / другие POST → 500 | Во время запроса упал другой endpoint (например, `finish`), транзакция откатилась. Сначала устраните основную проблему (например, токен Scibox). Все DB операции теперь имеют обработку ошибок с rollback. |
| В логах предупреждение `Field "model_*" has conflict with protected namespace` | Уже исправлено в `config.py` через `protected_namespaces=("settings_",)`. Если предупреждение появляется, обновите код. |
| «Code execution service is disabled» | Контейнер backend запущен без доступа к `/var/run/docker.sock`. Чтобы реально запускать код, убедитесь, что volume `/var/run/docker.sock` подключен в `docker-compose.yml` и перезапустите стек, либо работайте в режиме «только LLM‑оценка». |
| `InvalidTextRepresentationError: invalid input value for enum *` | Проблема с типами данных в БД. Убедитесь, что миграции применены (`alembic upgrade head`). Поле `direction` в таблице `interviews` теперь `varchar(50)`, а не enum. |
| Суперадмин не может войти | Пароль суперадмина синхронизируется с `SUPERADMIN_PASSWORD` из `.env` при каждой попытке входа. Убедитесь, что в `.env` указан правильный пароль и перезапустите backend. |
| Задачи не загружаются из банка | Проверьте, что задачи добавлены в банк через админ‑панель, имеют правильное направление и сложность. Система исключает задачи, использованные более 10 раз. Если подходящих задач нет, система автоматически генерирует новую через LLM. |
| IDE показывает белый экран | Проблема с инициализацией Monaco Editor. Проверьте логи фронтенда. Тема редактора должна инициализироваться до монтирования компонента. При ошибке инициализации редактор показывается через 5 секунд (таймаут). |

---

## Полезные команды

```bash
# Проверить доступность Scibox
curl -H "Authorization: Bearer $SCIBOX_API_KEY" https://llm.t1v.scibox.tech/v1/models

# Подключиться к контейнеру backend
docker compose exec backend /bin/sh

# Просмотреть логи бэкенда
docker compose logs -f backend

# Применить миграции вручную
cd backend && alembic upgrade head
```

---

## Дополнительные замечания

### Архитектурные особенности

- **Обработка ошибок:** Все DB операции обёрнуты в `safe_db_operation()` с автоматическим rollback при ошибках. Docker операции имеют fallback на `docker-cli` при недоступности SDK.
- **Адаптивная сложность:** Количество задач (4-8) и их сложность автоматически подстраиваются под производительность кандидата на основе среднего балла предыдущих задач.
- **Метрики античита:** Система отслеживает паттерны печати (WPM, CV, backspace ratio), временные метки изменений кода, анализ стиля кода через LLM, сетевую активность, операции с буфером обмена. Все метрики сохраняются в `anti_cheat_metrics` для долгосрочного анализа.
- **Счётчики активности:** Каждая задача отслеживает `submission_attempts`, `test_runs`, `compilation_errors`, `execution_errors` для анализа поведения кандидата.
- **Локализация:** Задачи и ответы AI интервьюера генерируются на языке, выбранном при старте интервью (`task_language`: `ru`/`en`).

### Отладка и разработка

- Весь код, связанный с LLM, находится в `backend/app/services/scibox_client.py`. Для отладки можно временно выводить `payload` и `response.text` перед `response.raise_for_status()`.
- Системные промпты для генерации задач включают требования по edge cases (пустые входы, граничные значения, большие входы).
- ESLint/Playwright тесты для фронтенда и Pytest для бэкенда пока не добавлены.
- `app/services/auth.py` использует `bcrypt`. При прямых вставках пользователей в БД генерируйте хэши тем же способом. Пароли длиннее 72 байт автоматически обрезаются.
- README и `.env.template` нужно обновлять при изменении инфраструктуры или переменных окружения.

### Миграции базы данных

Все миграции находятся в `backend/alembic/versions/`:
- `001_initial.py` — начальная схема
- `002_add_task_language_and_super_admin.py` — добавлен `task_language` в `interviews`
- `003_add_anti_cheat_metrics.py` — расширенные метрики античита
- `004_add_attempts_and_errors_tracking.py` — счётчики попыток и ошибок
- `005_add_task_bank.py` — таблица банка задач
- `006_add_use_task_bank.py` — флаг использования банка задач
- `007_add_test_runs.py` — счётчик запусков тестов

Применение миграций: `docker compose exec backend alembic upgrade head` или `cd backend && alembic upgrade head`.

### Производительность и ограничения

- **Docker контейнеры:** Ограничения по времени (`DOCKER_TIMEOUT`), памяти (`DOCKER_MEMORY_LIMIT`) и CPU (`DOCKER_CPU_LIMIT`). Тесты автоматически прерываются при превышении лимитов.
- **Scibox API:** Health check выполняется при старте backend. При ошибке 401 backend останавливается, чтобы избежать каскадных ошибок.
- **Банк задач:** Задачи с `times_used > 10` исключаются из автоматического выбора. Эмбеддинги генерируются при добавлении задачи для семантического поиска.
