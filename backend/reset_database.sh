#!/bin/bash
# Скрипт для полного пересоздания базы данных
# ВНИМАНИЕ: Это удалит все данные!

echo "⚠️  ВНИМАНИЕ: Это удалит все данные из базы данных!"
echo "Нажмите Ctrl+C для отмены или Enter для продолжения..."
read

echo "Останавливаем контейнеры..."
docker compose down

echo "Удаляем volume с базой данных..."
docker volume rm interview-platform_postgres_data 2>/dev/null || true

echo "Запускаем контейнеры заново..."
docker compose up -d postgres

echo "Ждем запуска PostgreSQL..."
sleep 5

echo "Применяем миграции..."
docker compose exec -T backend alembic downgrade base 2>/dev/null || true
docker compose exec -T backend alembic upgrade head

echo "✅ База данных пересоздана!"
echo "Теперь можно запустить все сервисы: docker compose up"

