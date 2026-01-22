// Модуль для сетевого взаимодействия с сервером

class NetworkManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.playerName = '';
        this.worldId = 'default';
        this.onWorldStateCallback = null;
        this.onPlayerJoinedCallback = null;
        this.onPlayerLeftCallback = null;
    }

    // Подключение к серверу
    connect(serverUrl = 'http://localhost:3000') {
        if (this.socket && this.isConnected) {
            console.log('Уже подключен к серверу');
            return;
        }

        this.socket = io(serverUrl);

        this.socket.on('connect', () => {
            this.isConnected = true;
            console.log('✅ Подключен к серверу');
            if (window.addLogEntry) {
                window.addLogEntry('✅ Подключен к серверу');
            }
        });

        this.socket.on('disconnect', () => {
            this.isConnected = false;
            console.log('❌ Отключен от сервера');
            if (window.addLogEntry) {
                window.addLogEntry('❌ Отключен от сервера');
            }
        });

        this.socket.on('error', (error) => {
            console.error('Ошибка сервера:', error);
            if (window.addLogEntry) {
                window.addLogEntry(`❌ Ошибка: ${error.message || 'Неизвестная ошибка'}`);
            }
        });

        // Получение состояния мира
        this.socket.on('worldState', (data) => {
            console.log('Получено состояние мира:', data);
            if (this.onWorldStateCallback) {
                this.onWorldStateCallback(data);
            }
        });

        // Новый игрок присоединился
        this.socket.on('playerJoined', (data) => {
            console.log('Новый игрок:', data.player.name);
            if (window.addLogEntry) {
                window.addLogEntry(`👤 Игрок ${data.player.name} присоединился к миру`);
            }
            if (this.onPlayerJoinedCallback) {
                this.onPlayerJoinedCallback(data.player);
            }
        });

        // Игрок покинул
        this.socket.on('playerLeft', (data) => {
            console.log('Игрок покинул:', data.playerId);
            if (window.addLogEntry) {
                window.addLogEntry(`👋 Игрок покинул мир`);
            }
            if (this.onPlayerLeftCallback) {
                this.onPlayerLeftCallback(data.playerId);
            }
        });

        // Ресурс добавлен
        this.socket.on('resourceAdded', (resource) => {
            if (window.world && resource.owner !== this.socket.id) {
                // Добавляем ресурс, созданный другим игроком
                window.world.resources.push({
                    type: resource.type,
                    x: resource.x,
                    y: resource.y,
                    amount: resource.amount,
                    id: resource.id
                });
                window.world.draw();
            }
        });

        // Ресурс удален
        this.socket.on('resourceRemoved', (data) => {
            if (window.world) {
                const index = window.world.resources.findIndex(r => r.id === data.resourceId);
                if (index !== -1) {
                    window.world.resources.splice(index, 1);
                    window.world.draw();
                }
            }
        });

        // Животное добавлено
        this.socket.on('animalAdded', (animal) => {
            if (window.world && animal.owner !== this.socket.id) {
                window.world.animals.push({
                    type: animal.type,
                    x: animal.x,
                    y: animal.y,
                    health: animal.health,
                    hunger: animal.hunger,
                    owner: animal.owner,
                    tamed: animal.tamed,
                    id: animal.id
                });
                window.world.draw();
            }
        });

        // Хищник добавлен
        this.socket.on('predatorAdded', (predator) => {
            if (window.world && predator.owner !== this.socket.id) {
                window.world.predators.push({
                    type: predator.type,
                    x: predator.x,
                    y: predator.y,
                    health: predator.health,
                    hunger: predator.hunger,
                    target: predator.target,
                    id: predator.id
                });
                window.world.draw();
            }
        });

        // Агент обновлен
        this.socket.on('agentUpdated', (agentData) => {
            // Обновляем агента другого игрока
            if (window.simulation && agentData.owner !== this.socket.id) {
                // Логика обновления агентов других игроков
                // Можно создать визуальные маркеры для других игроков
            }
        });

        // Костер построен
        this.socket.on('fireBuilt', (fire) => {
            if (window.world && fire.owner !== this.socket.id) {
                window.world.fires.push({
                    x: fire.x,
                    y: fire.y,
                    intensity: fire.intensity,
                    id: fire.id
                });
                window.world.draw();
            }
        });

        // Постройка создана
        this.socket.on('structureBuilt', (building) => {
            if (window.world && building.owner !== this.socket.id) {
                // Добавляем постройку в мир
                if (!window.world.buildings) {
                    window.world.buildings = [];
                }
                window.world.buildings.push({
                    type: building.type,
                    x: building.x,
                    y: building.y,
                    id: building.id
                });
                window.world.draw();
            }
        });

        // Объект перемещен
        this.socket.on('objectMoved', (data) => {
            if (window.world && data.objectType === 'resource') {
                const resource = window.world.resources.find(r => r.id === data.objectId);
                if (resource) {
                    resource.x = data.x;
                    resource.y = data.y;
                    window.world.draw();
                }
            } else if (window.world && data.objectType === 'animal') {
                const animal = window.world.animals.find(a => a.id === data.objectId);
                if (animal) {
                    animal.x = data.x;
                    animal.y = data.y;
                    window.world.draw();
                }
            }
        });

        // Мир обновлен
        this.socket.on('worldUpdated', (data) => {
            if (window.world) {
                if (data.weather !== undefined) window.world.weather = data.weather;
                if (data.timeOfDay !== undefined) window.world.timeOfDay = data.timeOfDay;
                if (data.day !== undefined) window.world.day = data.day;
                window.world.draw();
            }
        });
    }

    // Регистрация игрока
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

    // Отправка обновления камеры
    updateCamera(camera) {
        if (this.socket && this.isConnected) {
            this.socket.emit('cameraUpdate', { camera });
        }
    }

    // Добавление ресурса
    addResource(type, x, y, amount = 1) {
        if (this.socket && this.isConnected) {
            this.socket.emit('addResource', {
                type: type,
                x: x,
                y: y,
                amount: amount
            });
        }
    }

    // Добавление животного
    addAnimal(type, x, y) {
        if (this.socket && this.isConnected) {
            this.socket.emit('addAnimal', {
                type: type,
                x: x,
                y: y
            });
        }
    }

    // Добавление хищника
    addPredator(type, x, y) {
        if (this.socket && this.isConnected) {
            this.socket.emit('addPredator', {
                type: type,
                x: x,
                y: y
            });
        }
    }

    // Обновление агента
    updateAgent(agentData) {
        if (this.socket && this.isConnected) {
            this.socket.emit('agentUpdate', {
                id: agentData.id,
                ...agentData
            });
        }
    }

    // Удаление ресурса
    removeResource(resourceId) {
        if (this.socket && this.isConnected) {
            this.socket.emit('removeResource', {
                resourceId: resourceId
            });
        }
    }

    // Постройка костра
    buildFire(x, y) {
        if (this.socket && this.isConnected) {
            this.socket.emit('buildFire', {
                x: x,
                y: y
            });
        }
    }

    // Постройка структуры
    buildStructure(type, x, y) {
        if (this.socket && this.isConnected) {
            this.socket.emit('buildStructure', {
                type: type,
                x: x,
                y: y
            });
        }
    }

    // Перемещение объекта
    moveObject(objectType, objectId, x, y) {
        if (this.socket && this.isConnected) {
            this.socket.emit('moveObject', {
                objectType: objectType,
                objectId: objectId,
                x: x,
                y: y
            });
        }
    }

    // Обновление мира
    updateWorld(data) {
        if (this.socket && this.isConnected) {
            this.socket.emit('worldUpdate', data);
        }
    }

    // Отключение
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }
}

// Глобальный экземпляр NetworkManager
window.networkManager = new NetworkManager();
