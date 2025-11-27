# Инструкция по пересозданию базы данных

## ⚠️ ВНИМАНИЕ: Это удалит все данные!

### Вариант 1: Полное пересоздание (рекомендуется для разработки)

**Windows (PowerShell):**
```powershell
cd backend
.\reset_database.ps1
```

**Linux/Mac:**
```bash
cd backend
chmod +x reset_database.sh
./reset_database.sh
```

**Или вручную:**
```bash
# 1. Остановить контейнеры
docker compose down

# 2. Удалить volume с данными
docker volume rm interview-platform_postgres_data

# 3. Запустить PostgreSQL
docker compose up -d postgres

# 4. Подождать запуска (5-10 секунд)
sleep 5

# 5. Применить миграции
docker compose exec backend alembic upgrade head

# 6. Запустить все сервисы
docker compose up
```

### Вариант 2: Обновление существующей БД (для продакшена)

**Если БД уже существует и нужно обновить схему:**

```bash
# 1. Создать резервную копию
docker compose exec postgres pg_dump -U postgres interview_db > backup.sql

# 2. Применить миграции
docker compose exec backend alembic upgrade head

# 3. Если возникли ошибки, восстановить из backup
docker compose exec -T postgres psql -U postgres interview_db < backup.sql
```

### Вариант 3: Ручное исправление типов (если миграции не работают)

Если миграции не применяются из-за несоответствия типов:

```sql
-- Подключиться к БД
docker compose exec postgres psql -U postgres interview_db

-- Удалить старые таблицы (⚠️ удалит данные!)
DROP TABLE IF EXISTS anti_cheat_metrics CASCADE;
DROP TABLE IF EXISTS task_bank CASCADE;
DROP TABLE IF EXISTS anti_cheat_events CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS interview_tasks CASCADE;
DROP TABLE IF EXISTS interviews CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- Удалить старые ENUM типы
DROP TYPE IF EXISTS anticheateventtype CASCADE;
DROP TYPE IF EXISTS interviewdirection CASCADE;
DROP TYPE IF EXISTS tasktype CASCADE;
DROP TYPE IF EXISTS interviewstatus CASCADE;
DROP TYPE IF EXISTS difficulty CASCADE;
DROP TYPE IF EXISTS programminglanguage CASCADE;

-- Применить миграции заново
\q
docker compose exec backend alembic upgrade head
```

## Проверка правильности схемы

После применения миграций проверьте:

```sql
-- Подключиться к БД
docker compose exec postgres psql -U postgres interview_db

-- Проверить типы колонок
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'interviews' 
AND column_name IN ('status', 'language', 'difficulty');

-- Должно быть:
-- status: enum (interviewstatus)
-- language: enum (programminglanguage)
-- difficulty: enum (difficulty)

-- Проверить ENUM типы
SELECT typname, enumlabel 
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE typname = 'interviewstatus';

-- Должно быть: pending, in_progress, completed, terminated
```

## Что было исправлено

1. **Миграция 001** переписана с нуля:
   - Все ENUM типы создаются ПЕРЕД таблицами
   - Все колонки используют правильные типы (ENUM вместо String)
   - Все поля из последующих миграций включены сразу

2. **Миграции 002-007** сделаны пустыми:
   - Все изменения уже в 001
   - Сохранена последовательность для совместимости

3. **Модели** проверены:
   - `Interview.status` - `SQLEnum(InterviewStatus)` ✅
   - `Interview.language` - `SQLEnum(ProgrammingLanguage)` ✅
   - `Interview.difficulty` - `SQLEnum(Difficulty)` ✅
   - `Interview.direction` - `String(50)` ✅ (правильно, не enum)
   - Все остальные enum поля проверены ✅

4. **Запросы** проверены:
   - Все сравнения с enum используют правильные типы ✅
   - Все `.value` используются только для JSON вывода ✅

## После пересоздания БД

1. Создайте суперадмина (автоматически при старте backend)
2. Добавьте задачи в банк через админ-панель
3. Проверьте работу интервью

