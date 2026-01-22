# Настройка для ISPmanager

## ⚠️ Важно: Исправление конфигурации

ISPmanager создал `package.json` с `"type": "commonjs"`, но проект использует ES modules. 

**Замените содержимое `/var/www/www-root/data/www/game.dekan.pro/package.json` на:**

```json
{
  "name": "artificial-life",
  "version": "1.0.0",
  "description": "Artificial Life - Сетевая симуляция жизни",
  "main": "backend/server.js",
  "type": "module",
  "scripts": {
    "start": "cd backend && node server.js",
    "dev": "cd backend && node --watch server.js"
  },
  "keywords": ["game", "multiplayer", "websocket"],
  "author": "",
  "license": "ISC",
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## Настройка Node.js приложения в ISPmanager

### 1. Создание приложения

В панели ISPmanager:

1. Перейдите в **WWW → Node.js приложения**
2. Нажмите **Создать**
3. Заполните:
   - **Домен**: `game.dekan.pro`
   - **Путь к приложению**: `/var/www/www-root/data/www/game.dekan.pro/backend`
   - **Файл запуска**: `server.js`
   - **Порт**: `3000` (или другой свободный)
   - **Переменные окружения**:
     ```
     NODE_ENV=production
     PORT=3000
     ```

### 2. Установка зависимостей

После создания приложения, выполните в терминале ISPmanager:

```bash
cd /var/www/www-root/data/www/game.dekan.pro/backend
npm install
```

### 3. Настройка Nginx для WebSocket

В ISPmanager настройте Nginx для проксирования WebSocket:

1. Перейдите в **WWW → Домены → game.dekan.pro → Настройки**
2. Добавьте в **Дополнительные директивы nginx**:

```nginx
# Проксирование WebSocket для Socket.io
location /socket.io/ {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
}

# Проксирование API запросов
location /api/ {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Важно**: Замените `3000` на порт, который указали в настройках Node.js приложения.

### 4. Обновление network.js

Файл `network.js` уже настроен на автоматическое определение URL. Он будет использовать:
- `http://localhost:3000` для локальной разработки
- Текущий домен (`https://game.dekan.pro`) для продакшена

## Проверка работы

1. **Проверьте статус приложения в ISPmanager**
2. **Откройте в браузере**: `https://game.dekan.pro`
3. **Проверьте консоль браузера** (F12) на наличие ошибок

## Обновление проекта

```bash
cd /var/www/www-root/data/www/game.dekan.pro
git pull origin main
cd backend
npm install --production
# Перезапустите приложение через ISPmanager
```

## Устранение проблем

### Ошибка: "Cannot use import statement outside a module"

Это означает, что `package.json` имеет `"type": "commonjs"`. Замените на `"type": "module"` как указано выше.

### WebSocket не подключается

1. Проверьте, что порт в Nginx конфигурации совпадает с портом Node.js приложения
2. Убедитесь, что добавлены заголовки `Upgrade` и `Connection`
3. Проверьте логи Nginx: `/var/log/nginx/game.dekan.pro.error.log`

### Приложение не запускается

1. Проверьте логи в ISPmanager
2. Убедитесь, что зависимости установлены: `cd backend && npm install`
3. Проверьте версию Node.js: `node --version` (должна быть >= 18.0.0)
