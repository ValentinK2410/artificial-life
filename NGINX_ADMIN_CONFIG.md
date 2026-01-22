# Конфигурация Nginx для админ-панели

## Добавьте в конфигурацию Nginx для домена game.dekan.pro

### Для HTTP (порт 80):

```nginx
# Админ-панель
location /admin {
    proxy_pass http://unix:/var/www/www-root/data/nodejs/0.sock;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# Статические файлы админ-панели
location ~ ^/(admin\.js|style\.css)$ {
    proxy_pass http://unix:/var/www/www-root/data/nodejs/0.sock;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Для HTTPS (порт 443):

```nginx
# Админ-панель
location /admin {
    proxy_pass http://unix:/var/www/www-root/data/nodejs/0.sock;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# Статические файлы админ-панели
location ~ ^/(admin\.js|style\.css)$ {
    proxy_pass http://unix:/var/www/www-root/data/nodejs/0.sock;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Где добавить

В ISPmanager:
1. WWW → WWW-домены → game.dekan.pro → Настройка
2. Вставьте конфигурацию в соответствующие блоки (HTTP и HTTPS)
3. Сохраните и перезагрузите Nginx

## Проверка

После настройки проверьте:
1. `https://game.dekan.pro/admin` - должна открыться форма входа
2. `https://game.dekan.pro/admin.js` - должен загрузиться JavaScript
3. `https://game.dekan.pro/style.css` - должны загрузиться стили

## Альтернативный вариант (если не работает через Unix socket)

Если Unix socket не работает, можно использовать localhost:

```nginx
location /admin {
    proxy_pass http://127.0.0.1:3000;
    # ... остальные настройки
}
```

Но в ISPmanager обычно используется Unix socket.
