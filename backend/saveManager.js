// Менеджер сохранения прогресса игры

import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Путь к папке сохранений
const SAVES_DIR = join(__dirname, 'saves');

// Убеждаемся, что папка существует
async function ensureSavesDir() {
    if (!existsSync(SAVES_DIR)) {
        await mkdir(SAVES_DIR, { recursive: true });
        console.log('📁 Создана папка для сохранений:', SAVES_DIR);
    }
}

// Сохранение состояния мира
export async function saveWorld(worldId, worldData) {
    try {
        await ensureSavesDir();
        
        // Преобразуем Map в обычный объект для сериализации
        const serializableWorld = {
            id: worldData.id,
            agents: worldData.agents || [],
            resources: worldData.resources || [],
            animals: worldData.animals || [],
            predators: worldData.predators || [],
            fires: worldData.fires || [],
            buildings: worldData.buildings || [],
            terrain: worldData.terrain || {},
            day: worldData.day || 1,
            timeOfDay: worldData.timeOfDay || 'day',
            weather: worldData.weather || 'sunny',
            // Сохраняем информацию об игроках (без socketId, так как они переподключаются)
            players: Array.from(worldData.players?.values() || []).map(player => ({
                id: player.id,
                name: player.name,
                worldId: player.worldId,
                camera: player.camera
            })),
            lastSaved: new Date().toISOString()
        };
        
        const filePath = join(SAVES_DIR, `world_${worldId}.json`);
        await writeFile(filePath, JSON.stringify(serializableWorld, null, 2), 'utf8');
        
        console.log(`💾 Мир ${worldId} сохранен (${serializableWorld.agents.length} агентов, ${serializableWorld.resources.length} ресурсов)`);
        return true;
    } catch (error) {
        console.error(`❌ Ошибка сохранения мира ${worldId}:`, error);
        return false;
    }
}

// Загрузка состояния мира
export async function loadWorld(worldId) {
    try {
        await ensureSavesDir();
        
        const filePath = join(SAVES_DIR, `world_${worldId}.json`);
        
        if (!existsSync(filePath)) {
            console.log(`📂 Сохранение для мира ${worldId} не найдено`);
            return null;
        }
        
        const data = await readFile(filePath, 'utf8');
        const worldData = JSON.parse(data);
        
        // Восстанавливаем Map для players
        const playersMap = new Map();
        if (worldData.players) {
            worldData.players.forEach(player => {
                playersMap.set(player.id, player);
            });
        }
        worldData.players = playersMap;
        
        console.log(`📂 Мир ${worldId} загружен (${worldData.agents?.length || 0} агентов, ${worldData.resources?.length || 0} ресурсов)`);
        return worldData;
    } catch (error) {
        console.error(`❌ Ошибка загрузки мира ${worldId}:`, error);
        return null;
    }
}

// Сохранение всех миров
export async function saveAllWorlds(gameWorlds) {
    try {
        await ensureSavesDir();
        
        const savePromises = [];
        for (const [worldId, worldData] of gameWorlds.entries()) {
            savePromises.push(saveWorld(worldId, worldData));
        }
        
        await Promise.all(savePromises);
        console.log(`💾 Сохранено ${savePromises.length} миров`);
        return true;
    } catch (error) {
        console.error('❌ Ошибка сохранения всех миров:', error);
        return false;
    }
}

// Загрузка всех сохранений
export async function loadAllWorlds() {
    try {
        await ensureSavesDir();
        
        const worlds = new Map();
        
        // В реальной реализации можно просканировать папку saves/
        // Для простоты загружаем только мир 'default'
        const defaultWorld = await loadWorld('default');
        if (defaultWorld) {
            worlds.set('default', defaultWorld);
        }
        
        return worlds;
    } catch (error) {
        console.error('❌ Ошибка загрузки миров:', error);
        return new Map();
    }
}

// Удаление сохранения мира
export async function deleteWorldSave(worldId) {
    try {
        const filePath = join(SAVES_DIR, `world_${worldId}.json`);
        if (existsSync(filePath)) {
            const { unlink } = await import('fs/promises');
            await unlink(filePath);
            console.log(`🗑️ Сохранение мира ${worldId} удалено`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`❌ Ошибка удаления сохранения мира ${worldId}:`, error);
        return false;
    }
}
