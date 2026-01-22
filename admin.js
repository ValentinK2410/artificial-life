// Админ-панель

// Определяем, продакшен или разработка
const isProduction = window.location.hostname !== 'localhost' && 
                     window.location.hostname !== '127.0.0.1' &&
                     !window.location.hostname.includes('localhost');

// Пароль администратора
// В ПРОДАКШЕНЕ ОБЯЗАТЕЛЬНО ИЗМЕНИТЕ НА СВОЙ СЛОЖНЫЙ ПАРОЛЬ!
const ADMIN_PASSWORD = isProduction 
    ? 'CHANGE_THIS_PASSWORD_IN_PRODUCTION' // ИЗМЕНИТЕ ЭТОТ ПАРОЛЬ!
    : 'admin123'; // Пароль для разработки

let socket = null;
let isConnected = false;
let isAuthenticated = false;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, есть ли сохраненная сессия
    const savedSession = localStorage.getItem('adminSession');
    if (savedSession) {
        try {
            const session = JSON.parse(savedSession);
            if (session.expires > Date.now()) {
                // Сессия еще действительна
                authenticate(session.token);
                return;
            } else {
                // Сессия истекла
                localStorage.removeItem('adminSession');
            }
        } catch (e) {
            localStorage.removeItem('adminSession');
        }
    }
    
    // Показываем форму входа
    setupLoginForm();
});

// Настройка формы входа
function setupLoginForm() {
    const loginBtn = document.getElementById('adminLoginBtn');
    const passwordInput = document.getElementById('adminPasswordInput');
    const errorMessage = document.getElementById('errorMessage');
    
    loginBtn.addEventListener('click', () => {
        const password = passwordInput.value.trim();
        
        if (!password) {
            showError('Введите пароль');
            return;
        }
        
        if (password === ADMIN_PASSWORD) {
            // Пароль правильный
            const sessionToken = generateSessionToken();
            const session = {
                token: sessionToken,
                expires: Date.now() + (24 * 60 * 60 * 1000) // 24 часа
            };
            localStorage.setItem('adminSession', JSON.stringify(session));
            
            authenticate(sessionToken);
        } else {
            showError('Неверный пароль');
            passwordInput.value = '';
        }
    });
    
    // Вход по Enter
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginBtn.click();
        }
    });
}

// Показать ошибку
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 5000);
}

// Генерация токена сессии
function generateSessionToken() {
    return 'admin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Аутентификация
function authenticate(sessionToken) {
    isAuthenticated = true;
    
    // Скрываем форму входа
    document.getElementById('adminLoginContainer').style.display = 'none';
    
    // Показываем админ-панель
    document.getElementById('adminPanelContainer').classList.add('active');
    
    // Подключаемся к серверу
    connectToServer();
    
    // Загружаем данные
    loadAdminData();
}

// Подключение к серверу
function connectToServer() {
    let serverUrl = null;
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        serverUrl = 'http://localhost:3000';
    } else {
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        serverUrl = `${protocol}//${window.location.hostname}`;
        if (window.location.port) {
            serverUrl = `${protocol}//${window.location.hostname}:${window.location.port}`;
        }
    }
    
    socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
        timeout: 10000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
    });
    
    socket.on('connect', () => {
        isConnected = true;
        console.log('✅ Подключен к серверу');
        
        // Запрашиваем данные администратора
        socket.emit('admin:requestData');
    });
    
    socket.on('connect_error', (error) => {
        isConnected = false;
        console.error('❌ Ошибка подключения:', error);
        showError('Не удалось подключиться к серверу');
    });
    
    socket.on('disconnect', () => {
        isConnected = false;
        console.log('❌ Отключен от сервера');
    });
    
    // Получение данных от сервера
    socket.on('admin:data', (data) => {
        updateAdminPanel(data);
    });
    
    // Обновление данных
    socket.on('admin:update', (data) => {
        updateAdminPanel(data);
    });
}

// Загрузка данных администратора
function loadAdminData() {
    if (socket && isConnected) {
        socket.emit('admin:requestData');
    } else {
        // Если нет подключения, используем локальные данные
        loadLocalAdminData();
    }
}

// Загрузка локальных данных (если нет сервера)
function loadLocalAdminData() {
    // Получаем всех агентов из window.agents (если доступно)
    if (window.agents) {
        const allAgents = window.agents.getAllAgents();
        const playersMap = new Map();
        
        allAgents.forEach(agent => {
            if (agent.ownerId) {
                if (!playersMap.has(agent.ownerId)) {
                    playersMap.set(agent.ownerId, {
                        id: agent.ownerId,
                        agents: [],
                        money: 0
                    });
                }
                const player = playersMap.get(agent.ownerId);
                player.agents.push(agent);
                
                const moneyItems = agent.inventory.filter(item => item.type === 'money');
                moneyItems.forEach(item => {
                    player.money += item.amount || 0;
                });
            }
        });
        
        updateAdminPanel({ players: Array.from(playersMap.values()) });
    }
}

// Обновление админ-панели
function updateAdminPanel(data) {
    const listContainer = document.getElementById('adminPlayerList');
    if (!listContainer) return;
    
    const players = data.players || [];
    
    if (players.length === 0) {
        listContainer.innerHTML = '<p style="color: #b0b0b0; text-align: center; padding: 40px;">Нет игроков в игре</p>';
        return;
    }
    
    let html = '<ul class="player-list">';
    players.forEach((player) => {
        html += `
            <li class="player-item">
                <div class="player-item-header">
                    <span class="player-name">Игрок: ${player.id.substring(0, 12)}...</span>
                </div>
                <p style="color: #b0b0b0; font-size: 12px;">Агентов: ${player.agents?.length || 0}, Денег: ${player.money || 0}</p>
                <div class="admin-actions">
                    <input type="number" class="admin-input" id="money_${player.id}" placeholder="Деньги" value="${player.money || 0}">
                    <button class="admin-btn" onclick="adminSetMoney('${player.id}')">Начислить деньги</button>
                    <input type="number" class="admin-input" id="health_${player.id}" placeholder="Здоровье" value="100" min="0" max="100">
                    <button class="admin-btn" onclick="adminSetHealth('${player.id}')">Установить здоровье</button>
                    <input type="text" class="admin-input" id="skill_${player.id}" placeholder="Навык (cooking, building...)" value="cooking">
                    <input type="number" class="admin-input" id="skillValue_${player.id}" placeholder="Значение" value="10">
                    <button class="admin-btn" onclick="adminSetSkill('${player.id}')">Установить навык</button>
                    <select class="admin-input" id="clothes_${player.id}">
                        <option value="summer_clothes_man">Одежда мужская летняя</option>
                        <option value="summer_clothes_woman">Одежда женская летняя</option>
                        <option value="winter_clothes_man">Одежда мужская зимняя</option>
                        <option value="winter_clothes_woman">Одежда женская зимняя</option>
                    </select>
                    <button class="admin-btn" onclick="adminGiveClothes('${player.id}')">Выдать одежду</button>
                </div>
            </li>
        `;
    });
    html += '</ul>';
    listContainer.innerHTML = html;
}

// Функции админ-действий
window.adminSetMoney = function(playerId) {
    const input = document.getElementById(`money_${playerId}`);
    const amount = parseInt(input.value) || 0;
    
    if (socket && isConnected) {
        socket.emit('admin:setMoney', { playerId, amount });
    } else {
        console.warn('Не подключен к серверу');
    }
    
    // Обновляем данные
    setTimeout(() => loadAdminData(), 500);
};

window.adminSetHealth = function(playerId) {
    const input = document.getElementById(`health_${playerId}`);
    const health = parseInt(input.value) || 100;
    
    if (socket && isConnected) {
        socket.emit('admin:setHealth', { playerId, health });
    }
    
    setTimeout(() => loadAdminData(), 500);
};

window.adminSetSkill = function(playerId) {
    const skillInput = document.getElementById(`skill_${playerId}`);
    const valueInput = document.getElementById(`skillValue_${playerId}`);
    const skill = skillInput.value;
    const value = parseInt(valueInput.value) || 0;
    
    if (socket && isConnected) {
        socket.emit('admin:setSkill', { playerId, skill, value });
    }
    
    setTimeout(() => loadAdminData(), 500);
};

window.adminGiveClothes = function(playerId) {
    const select = document.getElementById(`clothes_${playerId}`);
    const clothesType = select.value;
    
    if (socket && isConnected) {
        socket.emit('admin:giveClothes', { playerId, clothesType });
    }
    
    setTimeout(() => loadAdminData(), 500);
};

// Выход
function logout() {
    localStorage.removeItem('adminSession');
    isAuthenticated = false;
    
    if (socket) {
        socket.disconnect();
    }
    
    // Показываем форму входа
    document.getElementById('adminLoginContainer').style.display = 'flex';
    document.getElementById('adminPanelContainer').classList.remove('active');
    document.getElementById('adminPasswordInput').value = '';
}

// Автоматическое обновление данных каждые 5 секунд
setInterval(() => {
    if (isAuthenticated) {
        loadAdminData();
    }
}, 5000);
