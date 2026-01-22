#!/bin/bash
# Скрипт для проверки подключения к серверу

echo "🔍 Проверка подключения к серверу..."
echo ""

# Проверка локального подключения
echo "1. Проверка локального подключения (localhost:3000):"
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Сервер отвечает на localhost:3000"
    curl -s http://localhost:3000 | head -5
else
    echo "❌ Сервер не отвечает на localhost:3000"
fi

echo ""
echo "2. Проверка через Unix socket:"
if [ -S /var/www/www-root/data/nodejs/0.sock ]; then
    echo "✅ Unix socket существует"
    if curl -s --unix-socket /var/www/www-root/data/nodejs/0.sock http://localhost/ > /dev/null 2>&1; then
        echo "✅ Сервер отвечает через Unix socket"
    else
        echo "⚠️  Сервер не отвечает через Unix socket"
    fi
else
    echo "⚠️  Unix socket не найден"
fi

echo ""
echo "3. Проверка процесса Node.js:"
if pgrep -f "node.*server.js" > /dev/null; then
    echo "✅ Процесс Node.js запущен:"
    ps aux | grep "node.*server.js" | grep -v grep
else
    echo "❌ Процесс Node.js не найден"
fi

echo ""
echo "4. Проверка порта 3000:"
if netstat -tuln 2>/dev/null | grep :3000 > /dev/null || lsof -i :3000 2>/dev/null | grep LISTEN > /dev/null; then
    echo "✅ Порт 3000 слушается:"
    netstat -tuln 2>/dev/null | grep :3000 || lsof -i :3000 2>/dev/null | grep LISTEN
else
    echo "⚠️  Порт 3000 не слушается (возможно, используется Unix socket)"
fi

echo ""
echo "5. Проверка логов сервера:"
echo "Для просмотра логов выполните:"
echo "  sudo journalctl -u artificial-life -f  # если через systemd"
echo "  или проверьте логи в ISPmanager"
