#!/bin/bash
# Скрипт для проверки конфигурации Nginx

echo "🔍 Проверка конфигурации Nginx..."
echo ""

# Проверка, какой вариант используется в конфиге
echo "1. Проверка конфигурации Nginx для /socket.io/:"
if grep -q "proxy_pass http://unix:" /etc/nginx/conf.d/game.dekan.pro.conf 2>/dev/null || \
   grep -q "proxy_pass http://unix:" /etc/nginx/vhosts/game.dekan.pro.conf 2>/dev/null; then
    echo "   ⚠️  Используется Unix socket"
    echo "   Проверьте, существует ли socket файл:"
    if [ -S /var/www/www-root/data/nodejs/0.sock ]; then
        echo "   ✅ Unix socket существует: /var/www/www-root/data/nodejs/0.sock"
    else
        echo "   ❌ Unix socket НЕ существует!"
        echo "   💡 Решение: Измените proxy_pass на http://127.0.0.1:3000"
    fi
elif grep -q "proxy_pass http://127.0.0.1:3000" /etc/nginx/conf.d/game.dekan.pro.conf 2>/dev/null || \
     grep -q "proxy_pass http://127.0.0.1:3000" /etc/nginx/vhosts/game.dekan.pro.conf 2>/dev/null; then
    echo "   ✅ Используется порт 3000"
    echo "   Проверьте, слушает ли сервер на порту 3000:"
    if netstat -tuln | grep :3000 > /dev/null || lsof -i :3000 2>/dev/null | grep LISTEN > /dev/null; then
        echo "   ✅ Порт 3000 слушается"
    else
        echo "   ❌ Порт 3000 НЕ слушается!"
    fi
else
    echo "   ⚠️  Не удалось определить конфигурацию"
    echo "   Проверьте файлы конфигурации вручную:"
    echo "   - /etc/nginx/conf.d/game.dekan.pro.conf"
    echo "   - /etc/nginx/vhosts/game.dekan.pro.conf"
fi

echo ""
echo "2. Проверка синтаксиса Nginx:"
if nginx -t 2>&1 | grep -q "successful"; then
    echo "   ✅ Синтаксис конфигурации правильный"
else
    echo "   ❌ Ошибки в конфигурации:"
    nginx -t 2>&1 | grep -v "^$"
fi

echo ""
echo "3. Проверка статуса Nginx:"
if systemctl is-active --quiet nginx; then
    echo "   ✅ Nginx запущен"
else
    echo "   ❌ Nginx не запущен"
fi

echo ""
echo "4. Рекомендации:"
echo "   Если сервер работает на порту 3000, используйте:"
echo "   proxy_pass http://127.0.0.1:3000;"
echo ""
echo "   Если используется Unix socket, убедитесь что:"
echo "   - Socket файл существует: /var/www/www-root/data/nodejs/0.sock"
echo "   - Права доступа правильные (обычно www-root:www-root)"
echo "   - Nginx имеет доступ к socket файлу"
