# Устранение проблем с админ-панелью (502 Bad Gateway)

## Проблема: 502 Bad Gateway при открытии /admin

### Шаг 1: Проверьте, запущен ли Node.js сервер

В ISPmanager:
1. WWW → Node.js приложения → game.dekan.pro
2. Убедитесь, что статус "Запущено"
3. Если нет - нажмите "Запустить"

Или через SSH:
```bash
# Проверьте, запущен ли процесс
ps aux | grep node

# Проверьте логи
tail -f /var/www/httpd-logs/game.dekan.pro.error.log
```

### Шаг 2: Проверьте конфигурацию Nginx

В ISPmanager:
1. WWW → Домены → game.dekan.pro → Настройки
2. Убедитесь, что добавлен location для /admin:

```nginx
# Админ-панель
location /admin {
    proxy_pass http://unix:/var/www/www-root/data/nodejs/0.sock;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Port $server_port;
    proxy_cache_bypass $http_upgrade;
}
```

3. Сохраните и перезагрузите Nginx

### Шаг 3: Проверьте логи Node.js

```bash
# Логи приложения
tail -f /var/www/httpd-logs/game.dekan.pro.error.log

# Или логи Node.js (если настроены)
journalctl -u nodejs-game.dekan.pro -f
```

### Шаг 4: Проверьте пути к файлам

Убедитесь, что файлы существуют:
```bash
cd /var/www/www-root/data/www/game.dekan.pro
ls -la admin.html admin.js
```

### Шаг 5: Проверьте права доступа

```bash
chown -R www-data:www-data /var/www/www-root/data/www/game.dekan.pro
chmod -R 755 /var/www/www-root/data/www/game.dekan.pro
```

### Шаг 6: Тест подключения к серверу

```bash
# Проверьте, отвечает ли сервер
curl http://unix:/var/www/www-root/data/nodejs/0.sock:/admin

# Или через localhost (если настроен)
curl http://localhost:3000/admin
```

### Шаг 7: Перезапустите сервисы

```bash
# Перезапустите Node.js приложение в ISPmanager
# Или через systemd:
systemctl restart nodejs-game.dekan.pro

# Перезагрузите Nginx
nginx -t  # Проверка конфигурации
systemctl reload nginx
```

## Альтернативное решение

Если Unix socket не работает, можно использовать localhost:

В Nginx:
```nginx
location /admin {
    proxy_pass http://127.0.0.1:3000;
    # ... остальные настройки
}
```

Но в ISPmanager обычно используется Unix socket.

## Проверка после исправления

1. Откройте `https://game.dekan.pro/admin`
2. Должна появиться форма входа
3. Проверьте консоль браузера (F12) на наличие ошибок
4. Проверьте Network tab - должны загружаться admin.html, admin.js, style.css

## Если проблема сохраняется

1. Проверьте логи Nginx: `/var/www/httpd-logs/game.dekan.pro.error.log`
2. Проверьте логи Node.js
3. Убедитесь, что Node.js приложение действительно запущено
4. Проверьте, что файлы admin.html и admin.js существуют в корне проекта
