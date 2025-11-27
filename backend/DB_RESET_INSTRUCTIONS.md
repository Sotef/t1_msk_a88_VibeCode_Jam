# ⚠️ КРИТИЧЕСКИ ВАЖНО: Инструкция по пересозданию БД

## Проблема
База данных имеет несоответствие типов: поля `status`, `language`, `difficulty` и другие созданы как `VARCHAR`, но в моделях определены как `ENUM`. Это вызывает ошибки при запросах.

## Решение
Переписана миграция 001 с нуля с правильными ENUM типами. Все последующие миграции (002-007) сделаны пустыми, так как все изменения уже включены в 001.

## Шаги для пересоздания БД

### 1. Остановить все сервисы
```bash
docker compose down
```

### 2. Удалить volume с данными PostgreSQL
```bash
docker volume rm interview-platform_postgres_data
```

### 3. Запустить PostgreSQL
```bash
docker compose up -d postgres
```

### 4. Подождать 5-10 секунд для запуска БД

### 5. Применить миграции
```bash
docker compose exec backend alembic upgrade head
```

### 6. Запустить все сервисы
```bash
docker compose up
```

## Автоматический скрипт

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

## Что было исправлено

1. ✅ **Миграция 001** полностью переписана:
   - Все ENUM типы создаются ПЕРЕД таблицами через SQL команды
   - Все колонки используют правильные типы (`postgresql.ENUM` вместо `String`)
   - Все поля из миграций 002-007 включены сразу

2. ✅ **Модели** проверены:
   - `Interview.status` → `SQLEnum(InterviewStatus)` ✅
   - `Interview.language` → `SQLEnum(ProgrammingLanguage)` ✅
   - `Interview.difficulty` → `SQLEnum(Difficulty)` ✅
   - `Interview.direction` → `String(50)` ✅ (правильно, не enum)
   - Все остальные enum поля проверены ✅

3. ✅ **Запросы** проверены:
   - Все сравнения с enum используют правильные типы ✅
   - `Interview.status == InterviewStatus.COMPLETED` ✅
   - `TaskBank.direction == InterviewDirection(...)` ✅
   - Все `.value` используются только для JSON вывода ✅

4. ✅ **Миграции 002-007** сделаны пустыми:
   - Все изменения уже в 001
   - Сохранена последовательность для совместимости

## Проверка после применения

```sql
-- Подключиться к БД
docker compose exec postgres psql -U postgres interview_db

-- Проверить типы колонок
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'interviews' 
AND column_name IN ('status', 'language', 'difficulty');

-- Должно быть:
-- status: USER-DEFINED (interviewstatus)
-- language: USER-DEFINED (programminglanguage)
-- difficulty: USER-DEFINED (difficulty)

-- Проверить ENUM значения
SELECT typname, enumlabel 
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE typname = 'interviewstatus'
ORDER BY e.enumsortorder;

-- Должно быть: pending, in_progress, completed, terminated
```

## ⚠️ ВАЖНО

После пересоздания БД:
1. Все данные будут удалены
2. Суперадмин будет создан автоматически при старте backend
3. Нужно будет заново добавить задачи в банк через админ-панель

