#!/bin/bash

# Скрипт для первоначальной настройки на сервере
# Выполните на сервере: bash SERVER_SETUP.sh

set -e

REPO_URL="https://github.com/ValentinK2410/artificial-life.git"
DEPLOY_PATH="/var/www/www-root/data/www/game.dekan.pro"

echo "🚀 Настройка проекта Artificial Life на сервере..."

# Переходим в директорию
cd /var/www/www-root/data/www

# Если директория существует, удаляем её
if [ -d "game.dekan.pro" ]; then
    echo "⚠️  Директория существует. Удаляем старую версию..."
    rm -rf game.dekan.pro
fi

# Клонируем репозиторий
echo "📥 Клонируем репозиторий с GitHub..."
git clone $REPO_URL game.dekan.pro

# Переходим в директорию проекта
cd game.dekan.pro

# Устанавливаем зависимости backend
echo "📦 Устанавливаем зависимости backend..."
cd backend
npm install --production
cd ..

# Устанавливаем права доступа
echo "🔐 Устанавливаем права доступа..."
chown -R www-data:www-data $DEPLOY_PATH
chmod -R 755 $DEPLOY_PATH

echo ""
echo "✅ Проект успешно развернут!"
echo ""
echo "📝 Следующие шаги:"
echo "1. Настройте Node.js приложение в ISPmanager:"
echo "   - Путь: $DEPLOY_PATH/backend"
echo "   - Файл: server.js"
echo "   - Порт: 3000"
echo ""
echo "2. Настройте Nginx для WebSocket (см. ISP_SETUP.md)"
echo ""
echo "3. Запустите приложение через ISPmanager"
