# Настройка для ISPmanager

## Важно: Структура проекта

ISPmanager может создать свой `package.json` в корне. Убедитесь, что:

1. **В корне проекта** (`/var/www/www-root/data/www/game.dekan.pro/`) должен быть `package.json` с правильными настройками
2. **В папке backend** (`/var/www/www-root/data/www/game.dekan.pro/backend/`) должен быть свой `package.json` с зависимостями

## Настройка в ISPmanager

### 1. Node.js приложение

В ISPmanager создайте Node.js приложение:

- **Путь к приложению**: `/var/www/www-root/data/www/game.dekan.pro/backend`
- **Файл запуска**: `server.js`
- **Порт**: `3000` (или другой, если занят)
- **Переменные окружения**: 
  - `NODE_ENV=production`
  - `PORT=3000`

### 2. Установка зависимостей

После создания приложения в ISPmanager, выполните в терминале:

```bash
cd /var/www/www-root/data/www/game.dekan.pro/backend
npm install
```

### 3. Настройка Nginx (если нужно)

Если ISPmanager не настроил автоматически, добавьте в конфигурацию сайта:

```nginx
# Проксирование WebSocket
location /socket.io/ {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Проксирование API
location /api/ {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

### 4. Обновление network.js для продакшена

В файле `network.js` измените URL подключения:

```javascript
// Было:
window.networkManager.connect('http://localhost:3000');

// Должно быть (для продакшена):
window.networkManager.connect(window.location.origin);
// или
window.networkManager.connect('https://game.dekan.pro');
```

## Проверка работы

1. Проверьте, что Node.js приложение запущено в ISPmanager
2. Откройте `https://game.dekan.pro` в браузере
3. Проверьте консоль браузера (F12) на наличие ошибок подключения

## Обновление проекта

```bash
cd /var/www/www-root/data/www/game.dekan.pro
git pull origin main
cd backend
npm install --production
# Перезапустите приложение через ISPmanager
```
