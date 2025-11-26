# Runner Architecture

## Обзор

Runner - это отдельный сервис/модуль, отвечающий за безопасное выполнение пользовательского кода в изолированных контейнерах Docker. Он обеспечивает:

- Изоляцию выполнения кода
- Ограничения по времени и памяти
- Запуск тестов (видимых и скрытых)
- Сбор метрик выполнения

## Архитектура

```
Backend API → Runner Service → Docker Engine → Container → Code Execution
                                    ↓
                              Test Runner → Results
```

## Компоненты

### 1. Runner Service

Основной сервис, который управляет жизненным циклом контейнеров и выполнением кода.

**Основные функции:**
- Создание и управление Docker-контейнерами
- Выполнение кода с ограничениями
- Запуск тестов
- Сбор метрик (время, память)
- Очистка контейнеров

### 2. Container Pool

Пул предварительно созданных контейнеров для оптимизации производительности.

**Стратегия:**
- Поддерживать N готовых контейнеров для каждого языка
- Переиспользовать контейнеры между запросами
- Очищать контейнеры после каждого выполнения

### 3. Code Executor

Модуль, который выполняет код в контейнере.

**Процесс:**
1. Создать/получить контейнер из пула
2. Скопировать код в контейнер
3. Выполнить код с ограничениями
4. Запустить тесты
5. Собрать результаты
6. Очистить контейнер

### 4. Test Runner

Модуль для запуска тестов.

**Типы тестов:**
- **Видимые тесты**: Показываются кандидату
- **Скрытые тесты**: Используются только для оценки

**Формат тестов:**
```json
{
  "visible_tests": [
    {
      "id": "test_1",
      "input": "5",
      "expected_output": "120",
      "description": "Test factorial of 5"
    }
  ],
  "hidden_tests": [
    {
      "id": "hidden_1",
      "input": "0",
      "expected_output": "1",
      "description": "Edge case: factorial of 0"
    }
  ]
}
```

## Ограничения безопасности

### Для Python:
- **Время выполнения**: 5 секунд на тест
- **Память**: 256 MB
- **CPU**: 1 ядро
- **Сеть**: Отключена
- **Файловая система**: Только временная директория

### Для JavaScript (Node.js):
- **Время выполнения**: 5 секунд на тест
- **Память**: 256 MB
- **CPU**: 1 ядро
- **Сеть**: Отключена
- **Файловая система**: Только временная директория

## Формат выполнения

### Входные данные:
```json
{
  "language": "python" | "javascript",
  "code": "string",
  "tests": {
    "visible": [...],
    "hidden": [...]
  },
  "timeout_seconds": 5,
  "memory_limit_mb": 256
}
```

### Выходные данные:
```json
{
  "execution": {
    "status": "success" | "error" | "timeout" | "memory_limit",
    "stdout": "string",
    "stderr": "string",
    "exit_code": 0,
    "execution_time_ms": 123,
    "memory_usage_mb": 45.6
  },
  "test_results": {
    "visible": [
      {
        "id": "test_1",
        "status": "passed" | "failed",
        "input": "5",
        "expected_output": "120",
        "actual_output": "120",
        "execution_time_ms": 10,
        "error": null
      }
    ],
    "hidden": [
      {
        "id": "hidden_1",
        "status": "passed",
        "execution_time_ms": 5
        // Детали скрыты от кандидата
      }
    ]
  },
  "summary": {
    "visible_passed": 4,
    "visible_failed": 1,
    "hidden_passed": 8,
    "hidden_failed": 2
  }
}
```

## Реализация для Python

### Dockerfile:
```dockerfile
FROM python:3.11-slim

# Установка ограничений
RUN apt-get update && apt-get install -y \
    timeout \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Скрипт для выполнения кода
COPY run_python.sh /app/run_python.sh
RUN chmod +x /app/run_python.sh

CMD ["/app/run_python.sh"]
```

### Скрипт выполнения:
```bash
#!/bin/bash
# run_python.sh

CODE_FILE="/app/user_code.py"
TEST_FILE="/app/tests.json"
OUTPUT_FILE="/app/output.json"

# Записать код пользователя
cat > $CODE_FILE << 'EOF'
{{USER_CODE}}
EOF

# Выполнить код с ограничениями
timeout 5s python3 $CODE_FILE > /app/stdout.txt 2> /app/stderr.txt

# Запустить тесты
python3 /app/run_tests.py > $OUTPUT_FILE
```

## Реализация для JavaScript

### Dockerfile:
```dockerfile
FROM node:18-slim

WORKDIR /app

COPY run_javascript.sh /app/run_javascript.sh
RUN chmod +x /app/run_javascript.sh

CMD ["/app/run_javascript.sh"]
```

### Скрипт выполнения:
```bash
#!/bin/bash
# run_javascript.sh

CODE_FILE="/app/user_code.js"
TEST_FILE="/app/tests.json"
OUTPUT_FILE="/app/output.json"

# Записать код пользователя
cat > $CODE_FILE << 'EOF'
{{USER_CODE}}
EOF

# Выполнить код с ограничениями (через Node.js с ограничением памяти)
node --max-old-space-size=256 $CODE_FILE > /app/stdout.txt 2> /app/stderr.txt

# Запустить тесты
node /app/run_tests.js > $OUTPUT_FILE
```

## API Runner Service

### Endpoint: POST /run

**Request:**
```json
{
  "language": "python",
  "code": "def factorial(n):\n    return 1 if n == 0 else n * factorial(n-1)",
  "tests": {
    "visible": [...],
    "hidden": [...]
  }
}
```

**Response:**
```json
{
  "execution": {...},
  "test_results": {...},
  "summary": {...}
}
```

## Масштабирование

### Горизонтальное масштабирование:
- Несколько инстансов Runner Service
- Балансировка нагрузки через API Gateway
- Распределённый пул контейнеров

### Оптимизация:
- Переиспользование контейнеров
- Кэширование базовых образов
- Асинхронное выполнение тестов

## Безопасность

1. **Изоляция**: Каждый код выполняется в отдельном контейнере
2. **Ограничения ресурсов**: CPU, память, время
3. **Отключение сети**: Контейнеры не имеют доступа к сети
4. **Ограничение файловой системы**: Только временная директория
5. **Автоматическая очистка**: Контейнеры удаляются после выполнения

## Мониторинг

- Количество активных контейнеров
- Среднее время выполнения
- Процент успешных выполнений
- Использование ресурсов

