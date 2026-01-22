#!/bin/bash
# Скрипт для проверки и запуска сервера на продакшене

echo "🔍 Проверка статуса сервера..."

# Проверка, запущен ли процесс Node.js
if pgrep -f "node.*server.js" > /dev/null; then
    echo "✅ Сервер уже запущен"
    ps aux | grep "node.*server.js" | grep -v grep
else
    echo "❌ Сервер не запущен"
    echo ""
    echo "Для запуска сервера:"
    echo ""
    echo "Вариант 1: Через ISPmanager"
    echo "1. Войдите в ISPmanager"
    echo "2. Перейдите в 'Node.js приложения'"
    echo "3. Найдите приложение для game.dekan.pro"
    echo "4. Нажмите 'Запустить' или 'Перезапустить'"
    echo ""
    echo "Вариант 2: Через systemd"
    echo "sudo systemctl start artificial-life"
    echo "sudo systemctl status artificial-life"
    echo ""
    echo "Вариант 3: Вручную (временный запуск)"
    echo "cd /var/www/www-root/data/www/game.dekan.pro/backend"
    echo "NODE_ENV=production PORT=3000 node server.js"
fi

echo ""
echo "🔍 Проверка порта 3000..."
if netstat -tuln | grep :3000 > /dev/null || lsof -i :3000 > /dev/null 2>&1; then
    echo "✅ Порт 3000 занят (сервер работает)"
else
    echo "❌ Порт 3000 свободен (сервер не запущен)"
fi

echo ""
echo "🔍 Проверка Unix socket..."
if [ -S /var/www/www-root/data/nodejs/0.sock ]; then
    echo "✅ Unix socket существует"
    ls -la /var/www/www-root/data/nodejs/0.sock
else
    echo "⚠️  Unix socket не найден (возможно, используется TCP порт)"
fi
