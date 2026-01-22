# Исправление 502 Bad Gateway в ISPmanager

## Проблема

502 Bad Gateway означает, что Nginx не может подключиться к Node.js приложению через Unix socket.

## Решение

### 1. Проверьте, запущено ли Node.js приложение

В ISPmanager: **WWW → Node.js приложения → game.dekan.pro**

- Убедитесь, что приложение **запущено**
- Проверьте логи приложения на наличие ошибок
- Убедитесь, что путь к приложению правильный: `/var/www/www-root/data/www/game.dekan.pro/backend`

### 2. Исправленная конфигурация Nginx

**ВАЖНО**: Нужно добавить конфигурацию WebSocket в **ОБА** блока (HTTP и HTTPS), и исправить логику для статических файлов.

#### Для HTTP блока (порт 80):

```nginx
server {
    server_name game.dekan.pro www.game.dekan.pro;
    charset UTF-8;
    index index.php index.html;
    disable_symlinks if_not_owner from=$root_path;
    include /etc/nginx/vhosts-includes/*.conf;
    include /etc/nginx/vhosts-resources/game.dekan.pro/*.conf;
    include /etc/nginx/users-resources/www-root/*.conf;
    access_log /var/www/httpd-logs/game.dekan.pro.access.log;
    error_log /var/www/httpd-logs/game.dekan.pro.error.log notice;
    ssi on;
    set $root_path /var/www/www-root/data/www/game.dekan.pro;
    root $root_path;
    listen 82.146.39.18:80;
    gzip on;
    gzip_comp_level 5;
    gzip_disable "msie6";
    gzip_types text/plain text/css application/json application/x-javascript text/xml application/xml application/xml+rss text/javascript application/javascript image/svg+xml;
    
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
    
    # Статические файлы - отдаем напрямую
    location ~* ^.+\.(jpg|jpeg|gif|png|svg|js|css|mp3|ogg|mpe?g|avi|zip|gz|bz2?|rar|swf|webp|woff|woff2)$ {
        expires 24h;
        try_files $uri =404;
    }
    
    # Все остальное - через Node.js
    location / {
        try_files $uri $uri/ @fallback;
    }
    
    location @fallback {
        include /etc/nginx/vhosts-resources/game.dekan.pro/dynamic/*.conf;
        proxy_pass http://unix:/var/www/www-root/data/nodejs/0.sock;
        proxy_redirect http://unix:/var/www/www-root/data/nodejs/0.sock /;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;
        access_log off;
    }
}
```

#### Для HTTPS блока (порт 443) - ДОБАВЬТЕ ТО ЖЕ САМОЕ:

```nginx
server {
    server_name game.dekan.pro www.game.dekan.pro;
    ssl_certificate "/var/www/httpd-cert/www-root/game.dekan.pro_le1.crtca";
    ssl_certificate_key "/var/www/httpd-cert/www-root/game.dekan.pro_le1.key";
    ssl_ciphers EECDH:+AES256:-3DES:RSA+AES:!NULL:!RC4;
    ssl_prefer_server_ciphers on;
    ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;
    ssl_dhparam /etc/ssl/certs/dhparam4096.pem;
    charset UTF-8;
    index index.php index.html;
    disable_symlinks if_not_owner from=$root_path;
    include /etc/nginx/vhosts-includes/*.conf;
    include /etc/nginx/vhosts-resources/game.dekan.pro/*.conf;
    include /etc/nginx/users-resources/www-root/*.conf;
    access_log /var/www/httpd-logs/game.dekan.pro.access.log;
    error_log /var/www/httpd-logs/game.dekan.pro.error.log notice;
    ssi on;
    set $root_path /var/www/www-root/data/www/game.dekan.pro;
    root $root_path;
    listen 82.146.39.18:443 ssl;
    gzip on;
    gzip_comp_level 5;
    gzip_disable "msie6";
    gzip_types text/plain text/css application/json application/x-javascript text/xml application/xml application/xml+rss text/javascript application/javascript image/svg+xml;
    
    # WebSocket для Socket.io - ДОБАВЬТЕ ЭТО!
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

    # API запросы - ДОБАВЬТЕ ЭТО!
    location /api/ {
        proxy_pass http://unix:/var/www/www-root/data/nodejs/0.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;
    }
    
    # Статические файлы - отдаем напрямую
    location ~* ^.+\.(jpg|jpeg|gif|png|svg|js|css|mp3|ogg|mpe?g|avi|zip|gz|bz2?|rar|swf|webp|woff|woff2)$ {
        expires 24h;
        try_files $uri =404;
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
    location @fallback {
        include /etc/nginx/vhosts-resources/game.dekan.pro/dynamic/*.conf;
        proxy_pass http://unix:/var/www/www-root/data/nodejs/0.sock;
        proxy_redirect http://unix:/var/www/www-root/data/nodejs/0.sock /;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;
        access_log off;
    }
}
```

## Диагностика

### Проверьте логи Nginx:

```bash
tail -f /var/www/httpd-logs/game.dekan.pro.error.log
```

### Проверьте, существует ли Unix socket:

```bash
ls -la /var/www/www-root/data/nodejs/0.sock
```

### Проверьте статус Node.js приложения в ISPmanager:

1. **WWW → Node.js приложения → game.dekan.pro**
2. Проверьте статус (должно быть "Запущено")
3. Посмотрите логи приложения

### Проверьте, что файлы на месте:

```bash
ls -la /var/www/www-root/data/www/game.dekan.pro/index.html
ls -la /var/www/www-root/data/www/game.dekan.pro/backend/server.js
```

## Альтернативное решение (если Unix socket не работает)

Если проблема сохраняется, возможно, нужно использовать TCP порт вместо Unix socket. В этом случае:

1. В настройках Node.js приложения в ISPmanager укажите конкретный порт (например, 3000)
2. В Nginx конфигурации замените `http://unix:/var/www/www-root/data/nodejs/0.sock` на `http://127.0.0.1:3000`

Но сначала попробуйте убедиться, что приложение запущено в ISPmanager.
