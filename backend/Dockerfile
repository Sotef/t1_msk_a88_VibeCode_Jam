FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Установка системных зависимостей (кешируется отдельно)
RUN apt-get update && \
    apt-get install -y --no-install-recommends docker-cli && \
    rm -rf /var/lib/apt/lists/*

# Обновление pip (кешируется отдельно)
RUN pip install --no-cache-dir --upgrade pip

# КЕШИРОВАНИЕ ТОЛЬКО БИБЛИОТЕК: копируем requirements.txt и устанавливаем зависимости
# Этот слой кешируется и пересобирается ТОЛЬКО при изменении requirements.txt
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# КОД НЕ КЕШИРУЕТСЯ: копируем код всегда (кеш не используется)
COPY . .

EXPOSE 8000

CMD ["sh", "-c", "python -m app.scripts.health_check && uvicorn app.main:app --host 0.0.0.0 --port 8000"]

