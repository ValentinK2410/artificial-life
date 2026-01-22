# Конфигурация Nginx для ISPmanager

## Важно: ISPmanager использует Unix socket

ISPmanager проксирует запросы через Unix socket: `http://unix:/var/www/www-root/data/nodejs/0.sock`

## Что нужно добавить в ISPmanager

В панели ISPmanager: **WWW → Домены → game.dekan.pro → Настройки → Дополнительные директивы nginx**

Добавьте следующую конфигурацию **ПЕРЕД** блоком `location /`:

```nginx
# WebSocket для Socket.io
location /socket.io/ {
    proxy_pass http://unix:/var/www/www-root/data/nodejs/0.sock;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Port $server_port;
    proxy_read_timeout 86400;
    access_log off;
}

# API запросы
location /api/ {
    proxy_pass http://unix:/var/www/www-root/data/nodejs/0.sock;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Port $server_port;
}
```

## Полная структура location блоков должна быть:

```nginx
location /socket.io/ {
    # ... конфигурация выше
}

location /api/ {
    # ... конфигурация выше
}

location / {
    location ~* ^.+\.(jpg|jpeg|gif|png|svg|js|css|mp3|ogg|mpe?g|avi|zip|gz|bz2?|rar|swf|webp|woff|woff2)$ {
        expires 24h;
        try_files $uri $uri/ @fallback;
    }
    location / {
        try_files /does_not_exists @fallback;
    }
}
```

## Важные моменты

1. **Порядок важен**: `/socket.io/` должен быть **ПЕРЕД** общим `location /`
2. **Unix socket**: Используйте `http://unix:/var/www/www-root/data/nodejs/0.sock` (ISPmanager сам создаст правильный socket)
3. **Заголовки**: Обязательно добавьте `Upgrade` и `Connection` для WebSocket
4. **Timeout**: `proxy_read_timeout 86400` нужен для длительных WebSocket соединений

## Проверка после настройки

1. Сохраните конфигурацию в ISPmanager
2. ISPmanager автоматически перезагрузит Nginx
3. Проверьте логи на ошибки:
   ```bash
   tail -f /var/www/httpd-logs/game.dekan.pro.error.log
   ```
4. Откройте `https://game.dekan.pro` в браузере
5. Откройте консоль (F12) и проверьте подключение WebSocket

## Если WebSocket не работает

1. Убедитесь, что Node.js приложение запущено в ISPmanager
2. Проверьте, что location `/socket.io/` находится ПЕРЕД `location /`
3. Проверьте логи Nginx на наличие ошибок
4. Убедитесь, что все заголовки (`Upgrade`, `Connection`) добавлены
