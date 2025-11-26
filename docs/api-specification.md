# API Specification

## Base URL
```
http://localhost:8000/api
```

## Authentication
Для демо используем простую сессию по `interview_id`. В продакшене - JWT токены.

## Endpoints

### 1. Создание интервью

**POST** `/interviews`

Создаёт новую сессию интервью и генерирует задачу.

**Request Body:**
```json
{
  "language": "python" | "javascript",
  "level": "junior" | "middle",
  "candidate_name": "string" // опционально
}
```

**Response:**
```json
{
  "interview_id": "uuid",
  "task": {
    "id": "string",
    "title": "string",
    "description": "string",
    "language": "python" | "javascript",
    "level": "junior" | "middle",
    "initial_code": "string", // шаблон кода
    "examples": [
      {
        "input": "string",
        "output": "string",
        "explanation": "string"
      }
    ]
  },
  "created_at": "2025-01-XXTXX:XX:XXZ"
}
```

**Status Codes:**
- `201 Created` - Интервью создано
- `400 Bad Request` - Неверные параметры
- `500 Internal Server Error` - Ошибка генерации задачи

---

### 2. Получение информации об интервью

**GET** `/interviews/{interview_id}`

Возвращает информацию об интервью и текущую задачу.

**Response:**
```json
{
  "interview_id": "uuid",
  "language": "python",
  "level": "junior",
  "status": "IN_PROGRESS",
  "task": { /* task object */ },
  "current_code": "string",
  "created_at": "2025-01-XXTXX:XX:XXZ",
  "updated_at": "2025-01-XXTXX:XX:XXZ"
}
```

**Status Codes:**
- `200 OK` - Успешно
- `404 Not Found` - Интервью не найдено

---

### 3. Сохранение кода

**PUT** `/interviews/{interview_id}/code`

Сохраняет код кандидата.

**Request Body:**
```json
{
  "code": "string"
}
```

**Response:**
```json
{
  "success": true,
  "saved_at": "2025-01-XXTXX:XX:XXZ"
}
```

**Status Codes:**
- `200 OK` - Код сохранён
- `404 Not Found` - Интервью не найдено

---

### 4. Запуск тестов

**POST** `/interviews/{interview_id}/run`

Выполняет код и запускает тесты.

**Request Body:**
```json
{
  "code": "string"
}
```

**Response:**
```json
{
  "execution": {
    "status": "success" | "error" | "timeout",
    "stdout": "string",
    "stderr": "string",
    "execution_time_ms": 123,
    "memory_usage_mb": 45.6
  },
  "visible_tests": [
    {
      "id": "string",
      "name": "string",
      "status": "passed" | "failed",
      "input": "string",
      "expected_output": "string",
      "actual_output": "string",
      "error_message": "string" // если failed
    }
  ],
  "summary": {
    "total": 5,
    "passed": 3,
    "failed": 2
  }
}
```

**Status Codes:**
- `200 OK` - Тесты выполнены
- `400 Bad Request` - Неверный код
- `404 Not Found` - Интервью не найдено
- `500 Internal Server Error` - Ошибка выполнения

---

### 5. Чат с ИИ-интервьюером

**POST** `/interviews/{interview_id}/chat`

Отправляет сообщение ИИ-интервьюеру и получает ответ.

**Request Body:**
```json
{
  "message": "string"
}
```

**Response:**
```json
{
  "response": "string",
  "timestamp": "2025-01-XXTXX:XX:XXZ"
}
```

**Status Codes:**
- `200 OK` - Ответ получен
- `404 Not Found` - Интервью не найдено
- `500 Internal Server Error` - Ошибка LLM

---

### 6. Получение истории чата

**GET** `/interviews/{interview_id}/chat`

Возвращает историю сообщений чата.

**Response:**
```json
{
  "messages": [
    {
      "role": "user" | "assistant",
      "content": "string",
      "timestamp": "2025-01-XXTXX:XX:XXZ"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Успешно
- `404 Not Found` - Интервью не найдено

---

### 7. Отправка анти-чит события

**POST** `/interviews/{interview_id}/anti-cheat`

Регистрирует событие анти-читинга.

**Request Body:**
```json
{
  "event_type": "big_paste" | "devtools_opened" | "copy_from_description" | 
                "disable_js_attempt" | "suspicious_focus" | "tab_switch",
  "metadata": {
    "timestamp": "2025-01-XXTXX:XX:XXZ",
    "details": "string" // опционально
  }
}
```

**Response:**
```json
{
  "success": true,
  "event_id": "uuid"
}
```

**Status Codes:**
- `200 OK` - Событие зарегистрировано
- `400 Bad Request` - Неверный тип события
- `404 Not Found` - Интервью не найдено

---

### 8. Завершение интервью

**POST** `/interviews/{interview_id}/finish`

Завершает интервью и генерирует финальный отчёт.

**Response:**
```json
{
  "interview_id": "uuid",
  "status": "FINISHED",
  "report": {
    "metrics": {
      "correctness": 0.85,
      "optimality": 0.75,
      "code_style": 0.90,
      "soft_skills": 0.80,
      "overall_score": 0.825
    },
    "test_results": {
      "visible_tests": {
        "total": 5,
        "passed": 4,
        "failed": 1
      },
      "hidden_tests": {
        "total": 10,
        "passed": 8,
        "failed": 2
      }
    },
    "execution_stats": {
      "average_execution_time_ms": 120,
      "max_memory_usage_mb": 50.5,
      "total_runs": 15
    },
    "anti_cheat": {
      "total_events": 3,
      "suspicious_score": 0.2,
      "events": [
        {
          "type": "big_paste",
          "count": 1,
          "timestamp": "2025-01-XXTXX:XX:XXZ"
        }
      ]
    },
    "candidate_report": "Текстовый отзыв для кандидата...",
    "recruiter_report": "Текстовый отзыв для рекрутера...",
    "recommendations": {
      "level": "junior+",
      "strengths": ["хорошее понимание базовых концепций", "чистый код"],
      "weaknesses": ["оптимизация алгоритмов", "работа с граничными случаями"]
    }
  },
  "generated_at": "2025-01-XXTXX:XX:XXZ"
}
```

**Status Codes:**
- `200 OK` - Отчёт сгенерирован
- `404 Not Found` - Интервью не найдено
- `500 Internal Server Error` - Ошибка генерации отчёта

---

### 9. Получение отчёта

**GET** `/interviews/{interview_id}/report`

Возвращает финальный отчёт интервью (только для завершённых интервью).

**Response:**
```json
{
  /* тот же формат, что и в /finish */
}
```

**Status Codes:**
- `200 OK` - Отчёт возвращён
- `404 Not Found` - Интервью не найдено или не завершено

---

## Обработка ошибок

Все ошибки возвращаются в формате:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // опционально
  }
}
```

**Коды ошибок:**
- `INTERVIEW_NOT_FOUND` - Интервью не найдено
- `INVALID_CODE` - Неверный синтаксис кода
- `EXECUTION_TIMEOUT` - Превышено время выполнения
- `LLM_ERROR` - Ошибка при обращении к LLM
- `RUNNER_ERROR` - Ошибка выполнения кода

