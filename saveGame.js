// Система сохранения игры на клиенте (localStorage)

const SAVE_KEY_PREFIX = 'artificial_life_save_';
const SAVE_META_KEY = 'artificial_life_saves_meta';
const SNAPSHOT_KEY_PREFIX = 'artificial_life_snapshot_';
const SNAPSHOT_META_KEY = 'artificial_life_snapshots_meta';

// Получить ключ сохранения для игрока
function getSaveKey(playerName, worldId) {
    return `${SAVE_KEY_PREFIX}${playerName}_${worldId}`;
}

// Получить метаданные всех сохранений
export function getSaveMetadata() {
    try {
        const meta = localStorage.getItem(SAVE_META_KEY);
        return meta ? JSON.parse(meta) : {};
    } catch (error) {
        console.error('Ошибка получения метаданных сохранений:', error);
        return {};
    }
}

// Сохранить метаданные
function saveMetadata(meta) {
    try {
        localStorage.setItem(SAVE_META_KEY, JSON.stringify(meta));
    } catch (error) {
        console.error('Ошибка сохранения метаданных:', error);
    }
}

// Проверить наличие сохранения для игрока
export function hasSave(playerName, worldId) {
    const saveKey = getSaveKey(playerName, worldId);
    return localStorage.getItem(saveKey) !== null;
}

// Получить информацию о сохранении
export function getSaveInfo(playerName, worldId) {
    if (!hasSave(playerName, worldId)) {
        return null;
    }
    
    try {
        const saveKey = getSaveKey(playerName, worldId);
        const saveData = JSON.parse(localStorage.getItem(saveKey));
        return {
            playerName: saveData.playerName,
            worldId: saveData.worldId,
            lastSaved: saveData.lastSaved,
            day: saveData.worldState?.day || 1,
            agentsCount: saveData.worldState?.agents?.length || 0
        };
    } catch (error) {
        console.error('Ошибка получения информации о сохранении:', error);
        return null;
    }
}

// Сохранить игру
export function saveGame(playerName, worldId, gameState) {
    try {
        const saveKey = getSaveKey(playerName, worldId);
        
        // Получаем типы агентов из текущей команды
        const selectedAgentTypes = (gameState.agents || []).map(agent => agent.type);
        
        // Подготавливаем данные для сохранения
        const saveData = {
            playerName,
            worldId,
            lastSaved: new Date().toISOString(),
            version: window.GAME_VERSION || '1.0.0',
            selectedAgentTypes: selectedAgentTypes, // Сохраняем типы выбранных агентов
            worldState: {
                // Состояние мира
                day: gameState.world?.day || 1,
                timeOfDay: gameState.world?.timeOfDay || 'day',
                weather: gameState.world?.weather || 'sunny',
                
                // Агенты
                agents: (gameState.agents || []).map(agent => ({
                    id: agent.id,
                    name: agent.name,
                    age: agent.age,
                    gender: agent.gender,
                    type: agent.type,
                    ownerId: agent.ownerId,
                    health: agent.health,
                    energy: agent.energy,
                    hunger: agent.hunger,
                    thirst: agent.thirst,
                    temperature: agent.temperature,
                    mood: agent.mood,
                    satisfaction: agent.satisfaction,
                    position: agent.position ? { x: agent.position.x, y: agent.position.y } : { x: 0, y: 0 },
                    inventory: agent.inventory || [],
                    foodStorage: agent.foodStorage || [],
                    animalFoodStorage: agent.animalFoodStorage || [],
                    experience: agent.experience || {},
                    friends: agent.friends || [],
                    pets: agent.pets || [],
                    state: agent.state || 'explore',
                    angle: agent.angle || 0,
                    // Дополнительные данные для системы любви и семьи
                    bouquet: agent.bouquet || null,
                    inLove: agent.inLove || false,
                    beloved: agent.beloved || null,
                    children: agent.children || [],
                    pregnant: agent.pregnant || false,
                    pregnancyProgress: agent.pregnancyProgress || 0,
                    stroller: agent.stroller || null
                })),
                
                // Ресурсы
                resources: (gameState.world?.resources || []).map(resource => ({
                    id: resource.id,
                    type: resource.type,
                    x: resource.x,
                    y: resource.y,
                    amount: resource.amount || 1
                })),
                
                // Животные
                animals: (gameState.world?.animals || []).map(animal => ({
                    id: animal.id,
                    type: animal.type,
                    x: animal.x,
                    y: animal.y,
                    hunger: animal.hunger || 50,
                    health: animal.health || 100
                })),
                
                // Хищники
                predators: (gameState.world?.predators || []).map(predator => ({
                    id: predator.id,
                    type: predator.type,
                    x: predator.x,
                    y: predator.y,
                    hunger: predator.hunger || 50,
                    health: predator.health || 100
                })),
                
                // Костры
                fires: (gameState.world?.fires || []).map(fire => ({
                    id: fire.id,
                    x: fire.x,
                    y: fire.y,
                    intensity: fire.intensity || 1,
                    heatRadius: fire.heatRadius || 50,
                    wood: fire.wood || 0,
                    ownerId: fire.ownerId || null
                })),
                
                // Постройки
                buildings: (gameState.world?.buildings || []).map(building => ({
                    id: building.id,
                    type: building.type,
                    x: building.x,
                    y: building.y,
                    ownerId: building.ownerId || null
                })),
                
                // Террейн (лес, цветы и т.д.)
                terrain: gameState.world?.terrain ? {
                    forest: gameState.world.terrain.forest || [],
                    flowers: gameState.world.terrain.flowers || []
                } : {
                    forest: [],
                    flowers: []
                }
            },
            
            // Состояние симуляции
            simulation: {
                isRunning: gameState.simulation?.isRunning || false,
                simulationSpeed: gameState.simulation?.simulationSpeed || 300,
                frameCount: gameState.simulation?.frameCount || 0
            }
        };
        
        // Сохраняем в localStorage
        localStorage.setItem(saveKey, JSON.stringify(saveData));
        
        // Обновляем метаданные
        const meta = getSaveMetadata();
        meta[saveKey] = {
            playerName,
            worldId,
            lastSaved: saveData.lastSaved
        };
        saveMetadata(meta);
        
        console.log(`💾 Игра сохранена: ${playerName} в мире ${worldId}`);
        return true;
    } catch (error) {
        console.error('Ошибка сохранения игры:', error);
        // Проверяем, не переполнен ли localStorage
        if (error.name === 'QuotaExceededError') {
            console.error('❌ localStorage переполнен. Удалите старые сохранения.');
        }
        return false;
    }
}

// Загрузить игру
export function loadGame(playerName, worldId) {
    if (!hasSave(playerName, worldId)) {
        return null;
    }
    
    try {
        const saveKey = getSaveKey(playerName, worldId);
        const saveData = JSON.parse(localStorage.getItem(saveKey));
        
        // Проверяем версию (можно добавить миграцию при необходимости)
        if (saveData.version && saveData.version !== window.GAME_VERSION) {
            console.warn(`⚠️ Версия сохранения (${saveData.version}) отличается от текущей (${window.GAME_VERSION})`);
        }
        
        return saveData;
    } catch (error) {
        console.error('Ошибка загрузки игры:', error);
        return null;
    }
}

// Удалить сохранение
export function deleteSave(playerName, worldId) {
    try {
        const saveKey = getSaveKey(playerName, worldId);
        localStorage.removeItem(saveKey);
        
        // Удаляем из метаданных
        const meta = getSaveMetadata();
        delete meta[saveKey];
        saveMetadata(meta);
        
        console.log(`🗑️ Сохранение удалено: ${playerName} в мире ${worldId}`);
        return true;
    } catch (error) {
        console.error('Ошибка удаления сохранения:', error);
        return false;
    }
}

// Получить все сохранения игрока
export function getAllSaves(playerName) {
    const meta = getSaveMetadata();
    const saves = [];
    
    for (const [key, data] of Object.entries(meta)) {
        if (data.playerName === playerName) {
            saves.push({
                worldId: data.worldId,
                lastSaved: data.lastSaved,
                saveKey: key
            });
        }
    }
    
    return saves.sort((a, b) => new Date(b.lastSaved) - new Date(a.lastSaved));
}

// Очистить все сохранения (для отладки)
export function clearAllSaves() {
    try {
        const meta = getSaveMetadata();
        for (const key of Object.keys(meta)) {
            localStorage.removeItem(key);
        }
        localStorage.removeItem(SAVE_META_KEY);
        console.log('🗑️ Все сохранения очищены');
        return true;
    } catch (error) {
        console.error('Ошибка очистки сохранений:', error);
        return false;
    }
}

// ========== СИСТЕМА СЛЕПКОВ (SNAPSHOTS) ==========

// Получить ключ слепка
function getSnapshotKey(playerName, worldId, timestamp) {
    return `${SNAPSHOT_KEY_PREFIX}${playerName}_${worldId}_${timestamp}`;
}

// Получить метаданные всех слепков
function getSnapshotMetadata() {
    try {
        const meta = localStorage.getItem(SNAPSHOT_META_KEY);
        return meta ? JSON.parse(meta) : {};
    } catch (error) {
        console.error('Ошибка получения метаданных слепков:', error);
        return {};
    }
}

// Сохранить метаданные слепков
function saveSnapshotMetadata(meta) {
    try {
        localStorage.setItem(SNAPSHOT_META_KEY, JSON.stringify(meta));
    } catch (error) {
        console.error('Ошибка сохранения метаданных слепков:', error);
    }
}

// Создать слепок игры
export function createSnapshot(playerName, worldId, gameState, snapshotName = null) {
    try {
        const timestamp = Date.now();
        const snapshotKey = getSnapshotKey(playerName, worldId, timestamp);
        const date = new Date(timestamp);
        
        // Получаем типы агентов из текущей команды
        const selectedAgentTypes = (gameState.agents || []).map(agent => agent.type);
        
        // Подготавливаем данные для сохранения (аналогично saveGame, но с дополнительной информацией)
        const snapshotData = {
            playerName,
            worldId,
            timestamp,
            snapshotName: snapshotName || `Слепок ${date.toLocaleString('ru-RU')}`,
            createdAt: date.toISOString(),
            version: window.GAME_VERSION || '1.0.0',
            selectedAgentTypes: selectedAgentTypes,
            worldState: {
                // Состояние мира
                day: gameState.world?.day || 1,
                timeOfDay: gameState.world?.timeOfDay || 'day',
                weather: gameState.world?.weather || 'sunny',
                
                // Агенты (полная информация)
                agents: (gameState.agents || []).map(agent => ({
                    id: agent.id,
                    name: agent.name,
                    age: agent.age,
                    gender: agent.gender,
                    type: agent.type,
                    ownerId: agent.ownerId,
                    health: agent.health,
                    energy: agent.energy,
                    hunger: agent.hunger,
                    thirst: agent.thirst,
                    temperature: agent.temperature,
                    mood: agent.mood,
                    satisfaction: agent.satisfaction,
                    position: agent.position ? { x: agent.position.x, y: agent.position.y } : { x: 0, y: 0 },
                    inventory: agent.inventory || [],
                    foodStorage: agent.foodStorage || [],
                    animalFoodStorage: agent.animalFoodStorage || [],
                    experience: agent.experience || {},
                    friends: agent.friends || [],
                    pets: agent.pets || [],
                    state: agent.state || 'explore',
                    angle: agent.angle || 0,
                    // Дополнительные данные для системы любви и семьи
                    bouquet: agent.bouquet || null,
                    inLove: agent.inLove || false,
                    beloved: agent.beloved || null,
                    children: agent.children || [],
                    pregnant: agent.pregnant || false,
                    pregnancyProgress: agent.pregnancyProgress || 0,
                    stroller: agent.stroller || null
                })),
                
                // Ресурсы
                resources: (gameState.world?.resources || []).map(resource => ({
                    id: resource.id,
                    type: resource.type,
                    x: resource.x,
                    y: resource.y,
                    amount: resource.amount || 1
                })),
                
                // Животные
                animals: (gameState.world?.animals || []).map(animal => ({
                    id: animal.id,
                    type: animal.type,
                    x: animal.x,
                    y: animal.y,
                    hunger: animal.hunger || 50,
                    health: animal.health || 100
                })),
                
                // Хищники
                predators: (gameState.world?.predators || []).map(predator => ({
                    id: predator.id,
                    type: predator.type,
                    x: predator.x,
                    y: predator.y,
                    hunger: predator.hunger || 50,
                    health: predator.health || 100
                })),
                
                // Костры
                fires: (gameState.world?.fires || []).map(fire => ({
                    id: fire.id,
                    x: fire.x,
                    y: fire.y,
                    intensity: fire.intensity || 1,
                    heatRadius: fire.heatRadius || 50,
                    wood: fire.wood || 0,
                    ownerId: fire.ownerId || null
                })),
                
                // Постройки
                buildings: (gameState.world?.buildings || []).map(building => ({
                    id: building.id,
                    type: building.type,
                    x: building.x,
                    y: building.y,
                    ownerId: building.ownerId || null
                })),
                
                // Террейн (лес, цветы и т.д.)
                terrain: gameState.world?.terrain ? {
                    forest: gameState.world.terrain.forest || [],
                    flowers: gameState.world.terrain.flowers || []
                } : {
                    forest: [],
                    flowers: []
                }
            },
            
            // Состояние симуляции
            simulation: {
                isRunning: gameState.simulation?.isRunning || false,
                simulationSpeed: gameState.simulation?.simulationSpeed || 300,
                frameCount: gameState.simulation?.frameCount || 0
            }
        };
        
        // Сохраняем в localStorage
        localStorage.setItem(snapshotKey, JSON.stringify(snapshotData));
        
        // Обновляем метаданные
        const meta = getSnapshotMetadata();
        meta[snapshotKey] = {
            playerName,
            worldId,
            timestamp,
            snapshotName: snapshotData.snapshotName,
            createdAt: snapshotData.createdAt,
            day: snapshotData.worldState?.day || 1,
            agentsCount: snapshotData.worldState?.agents?.length || 0
        };
        saveSnapshotMetadata(meta);
        
        console.log(`📸 Слепок создан: ${snapshotData.snapshotName}`);
        return { success: true, snapshotKey, timestamp, snapshotName: snapshotData.snapshotName };
    } catch (error) {
        console.error('Ошибка создания слепка:', error);
        if (error.name === 'QuotaExceededError') {
            console.error('❌ localStorage переполнен. Удалите старые слепки.');
        }
        return { success: false, error: error.message };
    }
}

// Получить все слепки для игрока и мира
export function getAllSnapshots(playerName, worldId) {
    const meta = getSnapshotMetadata();
    const snapshots = [];
    
    for (const [key, data] of Object.entries(meta)) {
        if (data.playerName === playerName && data.worldId === worldId) {
            snapshots.push({
                snapshotKey: key,
                timestamp: data.timestamp,
                snapshotName: data.snapshotName,
                createdAt: data.createdAt,
                day: data.day || 1,
                agentsCount: data.agentsCount || 0
            });
        }
    }
    
    return snapshots.sort((a, b) => b.timestamp - a.timestamp); // Новые слепки первыми
}

// Загрузить слепок
export function loadSnapshot(snapshotKey) {
    try {
        const snapshotData = localStorage.getItem(snapshotKey);
        if (!snapshotData) {
            return null;
        }
        
        const data = JSON.parse(snapshotData);
        
        // Проверяем версию
        if (data.version && data.version !== window.GAME_VERSION) {
            console.warn(`⚠️ Версия слепка (${data.version}) отличается от текущей (${window.GAME_VERSION})`);
        }
        
        return data;
    } catch (error) {
        console.error('Ошибка загрузки слепка:', error);
        return null;
    }
}

// Удалить слепок
export function deleteSnapshot(snapshotKey) {
    try {
        localStorage.removeItem(snapshotKey);
        
        // Удаляем из метаданных
        const meta = getSnapshotMetadata();
        delete meta[snapshotKey];
        saveSnapshotMetadata(meta);
        
        console.log(`🗑️ Слепок удален`);
        return true;
    } catch (error) {
        console.error('Ошибка удаления слепка:', error);
        return false;
    }
}

// Очистить все слепки для мира
export function clearAllSnapshots(playerName, worldId) {
    try {
        const meta = getSnapshotMetadata();
        let deleted = 0;
        
        for (const [key, data] of Object.entries(meta)) {
            if (data.playerName === playerName && data.worldId === worldId) {
                localStorage.removeItem(key);
                delete meta[key];
                deleted++;
            }
        }
        
        saveSnapshotMetadata(meta);
        console.log(`🗑️ Удалено ${deleted} слепков`);
        return true;
    } catch (error) {
        console.error('Ошибка очистки слепков:', error);
        return false;
    }
}
