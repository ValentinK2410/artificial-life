# Инструкция по исправлению конфигурации Nginx

## Проблемы в текущей конфигурации:

1. ❌ Неправильные отступы (табуляция) в блоках админ-панели
2. ❌ Порядок location блоков - `/admin` должен быть ПЕРЕД общим `location /`
3. ❌ Отсутствует `proxy_http_version 1.1` в некоторых местах

## Правильная конфигурация:

Используйте файл `NGINX_FIXED_CONFIG.conf` - там все исправлено.

## Как применить:

### Вариант 1: Через ISPmanager (рекомендуется)

1. Войдите в ISPmanager
2. WWW → Домены → game.dekan.pro → Настройки
3. Откройте файл `NGINX_FIXED_CONFIG.conf` из проекта
4. Скопируйте **БЛОК 1 (HTTP)** и вставьте в раздел HTTP
5. Скопируйте **БЛОК 2 (HTTPS)** и вставьте в раздел HTTPS
6. Сохраните
7. Проверьте конфигурацию: `nginx -t`
8. Перезагрузите Nginx

### Вариант 2: Через SSH

```bash
# Сделайте резервную копию
cp /etc/nginx/vhosts/game.dekan.pro.conf /etc/nginx/vhosts/game.dekan.pro.conf.backup

# Отредактируйте файл
nano /etc/nginx/vhosts/game.dekan.pro.conf

# Или используйте файл из проекта
# (скопируйте содержимое NGINX_FIXED_CONFIG.conf)

# Проверьте конфигурацию
nginx -t

# Если OK, перезагрузите
systemctl reload nginx
```

## Ключевые моменты:

1. **Порядок location блоков важен!**
   - `/socket.io/` - первый
   - `/api/` - второй
   - `/admin` - третий (ПЕРЕД общим `/`)
   - Статические файлы
   - `/` - последний (общий fallback)

2. **Отступы (табуляция)**
   - Все location блоки должны иметь одинаковые отступы
   - В ISPmanager обычно используется табуляция

3. **Проверка после изменений:**
   ```bash
   nginx -t
   ```
   Должно быть: `syntax is ok` и `test is successful`

## Если все еще не работает:

1. Проверьте логи:
   ```bash
   tail -f /var/www/httpd-logs/game.dekan.pro.error.log
   ```

2. Убедитесь, что Node.js приложение запущено:
   - В ISPmanager: WWW → Node.js приложения → game.dekan.pro
   - Статус должен быть "Запущено"

3. Проверьте права доступа:
   ```bash
   ls -la /var/www/www-root/data/www/game.dekan.pro/admin.html
   ls -la /var/www/www-root/data/nodejs/0.sock
   ```

4. Проверьте, что файлы существуют:
   ```bash
   cd /var/www/www-root/data/www/game.dekan.pro
   ls -la admin.html admin.js
   ```
