// Система сохранения игры на клиенте (localStorage)

const SAVE_KEY_PREFIX = 'artificial_life_save_';
const SAVE_META_KEY = 'artificial_life_saves_meta';

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
        
        // Подготавливаем данные для сохранения
        const saveData = {
            playerName,
            worldId,
            lastSaved: new Date().toISOString(),
            version: window.GAME_VERSION || '1.0.0',
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
                    angle: agent.angle || 0
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
                }))
            },
            
            // Состояние симуляции
            simulation: {
                isRunning: gameState.simulation?.isRunning || false,
                simulationSpeed: gameState.simulation?.simulationSpeed || 20,
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
