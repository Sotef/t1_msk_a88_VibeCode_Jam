# Interview Flow

## Общий флоу интервью

### 1. Инициализация интервью

```
Кандидат → Выбор направления (Python/JavaScript) → Выбор уровня (Junior/Middle) 
→ Создание сессии интервью → Генерация начальной задачи
```

**Действия:**
- Пользователь выбирает язык программирования и уровень сложности
- Backend создаёт сессию интервью с уникальным ID
- LLM генерирует задачу соответствующего уровня
- Задача сохраняется в БД вместе с видимыми и скрытыми тестами

### 2. Работа над задачей

```
Кандидат пишет код в IDE → Сохранение кода → Запуск видимых тестов 
→ Получение результатов → Общение с ИИ-интервьюером в чате
```

**Действия:**
- Кандидат пишет код в Monaco Editor
- При сохранении/запуске код отправляется на Runner
- Runner выполняет код в изолированном Docker-контейнере
- Запускаются видимые тесты (результаты показываются кандидату)
- Скрытые тесты выполняются, но результаты не показываются
- ИИ-интервьюер анализирует код и задаёт вопросы в чате

### 3. Адаптивное взаимодействие

```
ИИ анализирует код → Определяет уровень понимания → Адаптирует вопросы 
→ Может усложнить/упростить задачу → Даёт подсказки при необходимости
```

**Действия:**
- LLM анализирует написанный код
- Оценивает подход, стиль, наличие ошибок
- Задаёт уточняющие вопросы в чате
- Может предложить улучшения или альтернативные подходы
- При необходимости генерирует дополнительные подзадачи

### 4. Анти-читинг мониторинг

```
Frontend отслеживает события → Отправка событий на Backend 
→ Агрегация событий по сессии → Включение в финальный отчёт
```

**События:**
- `big_paste` - большой вставленный фрагмент кода
- `devtools_opened` - открытие DevTools
- `copy_from_description` - копирование из описания задачи
- `disable_js_attempt` - попытка отключить JavaScript
- `suspicious_focus` - подозрительное переключение фокуса
- `tab_switch` - переключение вкладок

### 5. Завершение интервью

```
Кандидат завершает задачу → Финальный анализ кода → Генерация отчёта 
→ Показ отчёта кандидату → Сохранение отчёта для рекрутера
```

**Действия:**
- Кандидат нажимает "Завершить интервью"
- Backend запускает финальный анализ:
  - Анализ всех версий кода
  - Результаты всех тестов (видимых и скрытых)
  - Статистика по времени и памяти
  - Анализ анти-чит событий
  - Оценка soft-skills из чата
- LLM генерирует структурированный отчёт:
  - Метрики (правильность, оптимальность, стиль кода)
  - Текстовый отзыв для кандидата
  - Текстовый отзыв для рекрутера
  - Рекомендации по уровню

## Детальный флоу по этапам

### Этап 1: Генерация задачи

```mermaid
sequenceDiagram
    participant C as Candidate
    participant API as Backend API
    participant LLM as LLM Service
    participant DB as Database
    
    C->>API: POST /api/interviews (language, level)
    API->>DB: Create interview session
    API->>LLM: Generate task (level, language)
    LLM->>LLM: Generate problem description
    LLM->>LLM: Generate visible tests
    LLM->>LLM: Generate hidden tests
    LLM->>API: Return task + tests
    API->>DB: Save task and tests
    API->>C: Return interview_id + task
```

### Этап 2: Выполнение кода

```mermaid
sequenceDiagram
    participant C as Candidate
    participant API as Backend API
    participant Runner as Code Runner
    participant Docker as Docker Container
    
    C->>API: POST /api/interviews/{id}/code (code)
    API->>Runner: Execute code
    Runner->>Docker: Create container
    Runner->>Docker: Run code + visible tests
    Docker->>Runner: Test results
    Runner->>Docker: Run hidden tests
    Docker->>Runner: Hidden test results
    Runner->>API: Return all results
    API->>C: Return visible test results only
    API->>LLM: Analyze code + results
    LLM->>API: Return analysis
    API->>C: Chat message from AI
```

### Этап 3: Чат с ИИ

```mermaid
sequenceDiagram
    participant C as Candidate
    participant API as Backend API
    participant LLM as LLM Interviewer
    participant DB as Database
    
    C->>API: POST /api/interviews/{id}/chat (message)
    API->>DB: Load interview context
    API->>LLM: Chat request (history + code + context)
    LLM->>LLM: Generate response
    LLM->>API: Return response
    API->>DB: Save message to history
    API->>C: Return AI response
```

### Этап 4: Генерация отчёта

```mermaid
sequenceDiagram
    participant C as Candidate
    participant API as Backend API
    participant LLM as LLM Analyzer
    participant DB as Database
    
    C->>API: POST /api/interviews/{id}/finish
    API->>DB: Load all interview data
    API->>LLM: Generate report (code history, tests, chat, anti-cheat)
    LLM->>LLM: Analyze metrics
    LLM->>LLM: Generate candidate report
    LLM->>LLM: Generate recruiter report
    LLM->>API: Return structured report
    API->>DB: Save report
    API->>C: Return report
```

## Состояния интервью

1. **CREATED** - Интервью создано, задача сгенерирована
2. **IN_PROGRESS** - Кандидат работает над задачей
3. **CODE_SUBMITTED** - Код отправлен, тесты запущены
4. **CHATTING** - Активное общение с ИИ
5. **FINISHED** - Интервью завершено, отчёт сгенерирован

## Метрики для анализа

- **Правильность**: Процент пройденных тестов (видимых и скрытых)
- **Оптимальность**: Анализ сложности алгоритма (Big O)
- **Стиль кода**: Читаемость, именование, структура
- **Soft-skills**: Качество общения в чате, объяснение подхода
- **Анти-читинг**: Количество и тип подозрительных событий

