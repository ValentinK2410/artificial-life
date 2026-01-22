// Менеджер сетевого взаимодействия

export class NetworkManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.playerName = '';
        this.worldId = 'default';
        this.onWorldStateCallback = null;
        this.onPlayerJoinedCallback = null;
        this.onPlayerLeftCallback = null;
        this.onConnectionError = null;
    }

    // Подключение к серверу
    connect(serverUrl = null) {
        if (!serverUrl) {
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                serverUrl = 'http://localhost:3000';
            } else {
                const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
                serverUrl = `${protocol}//${window.location.hostname}`;
                if (window.location.port) {
                    serverUrl = `${protocol}//${window.location.hostname}:${window.location.port}`;
                }
            }
        }
        
        console.log('Подключение к серверу:', serverUrl);
        
        if (this.socket && this.isConnected) {
            console.log('Уже подключен к серверу');
            return;
        }

        this.socket = io(serverUrl, {
            transports: ['websocket', 'polling'],
            upgrade: true,
            rememberUpgrade: true,
            timeout: 10000,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });

        this.socket.on('connect', () => {
            this.isConnected = true;
            console.log('✅ Подключен к серверу');
            if (window.addLogEntry) {
                window.addLogEntry('✅ Подключен к серверу');
            }
        });

        this.socket.on('connect_error', (error) => {
            this.isConnected = false;
            console.error('❌ Ошибка подключения к серверу:', error);
            
            let errorMessage = '❌ Не удалось подключиться к серверу.';
            if (error.message) {
                if (error.message.includes('xhr poll error') || error.message.includes('timeout')) {
                    errorMessage += ' Сервер не отвечает. Проверьте, запущен ли сервер.';
                } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
                    errorMessage += ' Проблема с сетью. Проверьте подключение к интернету.';
                } else {
                    errorMessage += ` ${error.message}`;
                }
            }
            
            if (window.addLogEntry) {
                window.addLogEntry(errorMessage);
            }
            
            if (this.onConnectionError) {
                this.onConnectionError(error);
            }
        });

        this.socket.on('disconnect', () => {
            this.isConnected = false;
            console.log('❌ Отключен от сервера');
            if (window.addLogEntry) {
                window.addLogEntry('❌ Отключен от сервера');
            }
        });

        // Остальные обработчики событий будут добавлены
        this.setupEventHandlers();
    }
    
    setupEventHandlers() {
        // Обработчики событий от сервера
        // Будет реализовано из network.js
    }
    
    register(playerName, worldId = 'default') {
        if (!this.socket || !this.isConnected) {
            console.error('Не подключен к серверу');
            return;
        }

        this.playerName = playerName;
        this.worldId = worldId;

        this.socket.emit('register', {
            playerName: playerName,
            worldId: worldId
        });
    }
    
    // Остальные методы будут добавлены из network.js
}
