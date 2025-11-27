# Инструкция по применению миграций

Для исправления ошибки `column interview_tasks.submission_attempts does not exist` необходимо применить миграции базы данных.

## Шаги:

1. Убедитесь, что сервисы запущены:
   ```bash
   docker compose up -d
   ```

2. Примените миграции:
   ```bash
   docker compose exec backend alembic upgrade head
   ```

3. Если миграции не применяются, проверьте текущее состояние:
   ```bash
   docker compose exec backend alembic current
   ```

4. Если нужно, примените конкретные миграции:
   ```bash
   docker compose exec backend alembic upgrade 004  # Для submission_attempts
   docker compose exec backend alembic upgrade 005  # Для task_bank
   docker compose exec backend alembic upgrade 006  # Для use_task_bank
   ```

5. Перезапустите backend после применения миграций:
   ```bash
   docker compose restart backend
   ```

## Новые миграции:

- **004**: Добавляет поля `submission_attempts`, `compilation_errors`, `execution_errors` в таблицу `interview_tasks`
- **005**: Создает таблицу `task_bank` для хранения банка задач
- **006**: Добавляет поле `use_task_bank` в таблицу `interviews`

