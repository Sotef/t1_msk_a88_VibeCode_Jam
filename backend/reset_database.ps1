# Скрипт для полного пересоздания базы данных (PowerShell)
# ВНИМАНИЕ: Это удалит все данные!

Write-Host "⚠️  ВНИМАНИЕ: Это удалит все данные из базы данных!" -ForegroundColor Yellow
$confirmation = Read-Host "Нажмите Enter для продолжения или Ctrl+C для отмены"

Write-Host "Останавливаем контейнеры..." -ForegroundColor Cyan
docker compose down

Write-Host "Удаляем volume с базой данных..." -ForegroundColor Cyan
docker volume rm interview-platform_postgres_data 2>$null

Write-Host "Запускаем контейнеры заново..." -ForegroundColor Cyan
docker compose up -d postgres

Write-Host "Ждем запуска PostgreSQL..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

Write-Host "Применяем миграции..." -ForegroundColor Cyan
docker compose exec -T backend alembic downgrade base 2>$null
docker compose exec -T backend alembic upgrade head

Write-Host "✅ База данных пересоздана!" -ForegroundColor Green
Write-Host "Теперь можно запустить все сервисы: docker compose up" -ForegroundColor Green

