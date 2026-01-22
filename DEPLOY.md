# Инструкция по развертыванию на сервере

## Быстрое развертывание

### 1. Подключитесь к серверу по SSH

```bash
ssh root@valentink2410
```

### 2. Клонируйте репозиторий

```bash
cd /var/www/www-root/data/www
git clone https://github.com/ValentinK2410/artificial-life.git game.dekan.pro
cd game.dekan.pro
```

### 3. Установите зависимости

```bash
cd backend
npm install --production
cd ..
```

### 4. Настройте systemd service (для автозапуска)

```bash
# Скопируйте файл service
cp artificial-life.service /etc/systemd/system/

# Перезагрузите systemd
systemctl daemon-reload

# Включите автозапуск
systemctl enable artificial-life

# Запустите сервис
systemctl start artificial-life

# Проверьте статус
systemctl status artificial-life
```

### 5. Настройте Nginx

```bash
# Скопируйте конфигурацию
cp nginx.conf /etc/nginx/sites-available/game.dekan.pro

# Создайте симлинк
ln -s /etc/nginx/sites-available/game.dekan.pro /etc/nginx/sites-enabled/

# Проверьте конфигурацию
nginx -t

# Перезагрузите Nginx
systemctl reload nginx
```

### 6. Установите права доступа

```bash
chown -R www-data:www-data /var/www/www-root/data/www/game.dekan.pro
chmod -R 755 /var/www/www-root/data/www/game.dekan.pro
```

## Альтернатива: Использование PM2

Если предпочитаете PM2 вместо systemd:

```bash
# Установите PM2 глобально
npm install -g pm2

# Запустите приложение
cd /var/www/www-root/data/www/game.dekan.pro/backend
pm2 start server.js --name artificial-life

# Сохраните конфигурацию для автозапуска
pm2 save
pm2 startup
```

## Обновление проекта

```bash
cd /var/www/www-root/data/www/game.dekan.pro
git pull origin main
cd backend
npm install --production
systemctl restart artificial-life  # или pm2 restart artificial-life
```

## Проверка работы

1. **Проверьте backend сервер:**
```bash
curl http://localhost:3000
```

2. **Проверьте логи:**
```bash
# Systemd
journalctl -u artificial-life -f

# PM2
pm2 logs artificial-life
```

3. **Откройте в браузере:**
```
http://game.dekan.pro
```

## Настройка SSL (HTTPS)

После настройки основного функционала, настройте SSL сертификат:

```bash
# Используя certbot
certbot --nginx -d game.dekan.pro

# Или вручную обновите nginx.conf с SSL настройками
```

## Устранение проблем

### Сервер не запускается

```bash
# Проверьте логи
journalctl -u artificial-life -n 50

# Проверьте, занят ли порт 3000
lsof -i :3000

# Проверьте права доступа
ls -la /var/www/www-root/data/www/game.dekan.pro
```

### Nginx не проксирует WebSocket

Убедитесь, что в nginx.conf есть секция `/socket.io/` с правильными заголовками Upgrade и Connection.

### Проблемы с правами доступа

```bash
chown -R www-data:www-data /var/www/www-root/data/www/game.dekan.pro
chmod -R 755 /var/www/www-root/data/www/game.dekan.pro
```
