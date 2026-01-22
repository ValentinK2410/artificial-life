# Исправление проблемы с CSS

## Проблема
CSS файлы не загружаются, стили не применяются.

## Решение

### 1. Обновите конфигурацию Nginx

В файле `NGINX_FIXED_CONFIG.conf` добавлена правильная обработка CSS файлов:

```nginx
# Статические файлы CSS, JS - отдаем напрямую из файловой системы
location ~* \.(css|js)$ {
    root /var/www/www-root/data/www/game.dekan.pro;
    expires 24h;
    add_header Cache-Control "public, max-age=86400";
    try_files $uri =404;
}
```

**ВАЖНО:** Этот блок должен быть ПЕРЕД общим `location /` блоком!

### 2. Примените изменения на сервере

```bash
cd /var/www/www-root/data/www/game.dekan.pro
git pull origin main
```

### 3. Обновите конфигурацию Nginx в ISPmanager

1. WWW → Домены → game.dekan.pro → Настройки
2. Откройте файл `NGINX_FIXED_CONFIG.conf` из проекта
3. Скопируйте обновленные блоки для HTTP и HTTPS
4. Вставьте в конфигурацию Nginx
5. Сохраните и перезагрузите Nginx

### 4. Проверьте права доступа

```bash
# Убедитесь, что файл существует и доступен
ls -la /var/www/www-root/data/www/game.dekan.pro/style.css

# Установите правильные права
chmod 644 /var/www/www-root/data/www/game.dekan.pro/style.css
chown www-data:www-data /var/www/www-root/data/www/game.dekan.pro/style.css
```

### 5. Очистите кэш браузера

После обновления конфигурации:
- Нажмите Ctrl+F5 (или Cmd+Shift+R на Mac) для жесткой перезагрузки
- Или очистите кэш браузера

## Проверка

После применения изменений проверьте:

1. Откройте `https://game.dekan.pro/style.css` в браузере
2. Должен отображаться CSS код
3. Если видите CSS - значит файл отдается правильно
4. Если 404 - проверьте путь и права доступа

## Альтернативное решение (если не помогло)

Если CSS все еще не работает, можно временно отдавать его через Node.js:

В Nginx удалите блок для CSS и оставьте только:
```nginx
location / {
    try_files $uri $uri/ @fallback;
}
```

Тогда Node.js будет отдавать CSS как fallback.
