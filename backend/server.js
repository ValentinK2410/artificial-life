import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // В продакшене укажите конкретный домен
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Хранилище игровых миров
const gameWorlds = new Map(); // worldId -> { players, agents, resources, animals, predators, fires, buildings }

// Хранилище пользователей
const users = new Map(); // userId -> { name, worldId, socketId }

// Создание или получение мира
function getOrCreateWorld(worldId) {
    if (!gameWorlds.has(worldId)) {
        gameWorlds.set(worldId, {
            id: worldId,
            players: new Map(), // socketId -> playerData
            agents: [],
            resources: [],
            animals: [],
            predators: [],
            fires: [],
            buildings: [],
            terrain: {
                worldSize: 5000,
                clearing: { x: 2500, y: 2500, radius: 400 },
                pond: { centerX: 2500, centerY: 2500, radiusX: 150, radiusY: 100 },
                trees: [],
                stones: [],
                berryBushes: []
            },
            day: 1,
            timeOfDay: 'day',
            weather: 'sunny'
        });
    }
    return gameWorlds.get(worldId);
}

// Удаление пустого мира
function cleanupWorld(worldId) {
    const world = gameWorlds.get(worldId);
    if (world && world.players.size === 0) {
        gameWorlds.delete(worldId);
        console.log(`Мир ${worldId} удален (нет игроков)`);
    }
}

io.on('connection', (socket) => {
    console.log(`Игрок подключился: ${socket.id}`);

    // Регистрация игрока
    socket.on('register', (data) => {
        const { playerName, worldId = 'default' } = data;
        
        if (!playerName || playerName.trim() === '') {
            socket.emit('error', { message: 'Имя игрока обязательно' });
            return;
        }

        const world = getOrCreateWorld(worldId);
        
        // Добавляем игрока в мир
        world.players.set(socket.id, {
            id: socket.id,
            name: playerName,
            worldId: worldId,
            camera: { x: 0, y: 0, scale: 1.0 }
        });

        users.set(socket.id, {
            name: playerName,
            worldId: worldId
        });

        // Присоединяем к комнате мира
        socket.join(worldId);

        // Отправляем текущее состояние мира новому игроку
        socket.emit('worldState', {
            world: {
                id: world.id,
                agents: world.agents,
                resources: world.resources,
                animals: world.animals,
                predators: world.predators,
                fires: world.fires,
                buildings: world.buildings,
                terrain: world.terrain,
                day: world.day,
                timeOfDay: world.timeOfDay,
                weather: world.weather
            },
            players: Array.from(world.players.values())
        });

        // Уведомляем других игроков о новом участнике
        socket.to(worldId).emit('playerJoined', {
            player: {
                id: socket.id,
                name: playerName
            }
        });

        console.log(`Игрок ${playerName} присоединился к миру ${worldId}`);
    });

    // Обновление позиции камеры игрока
    socket.on('cameraUpdate', (data) => {
        const user = users.get(socket.id);
        if (!user) return;

        const world = gameWorlds.get(user.worldId);
        if (!world) return;

        const player = world.players.get(socket.id);
        if (player) {
            player.camera = data.camera;
            // Можно транслировать другим игрокам, если нужно видеть камеры других
        }
    });

    // Добавление ресурса
    socket.on('addResource', (data) => {
        const user = users.get(socket.id);
        if (!user) return;

        const world = gameWorlds.get(user.worldId);
        if (!world) return;

        const resource = {
            id: uuidv4(),
            type: data.type,
            x: data.x,
            y: data.y,
            amount: data.amount || 1,
            owner: socket.id,
            createdAt: Date.now()
        };

        world.resources.push(resource);

        // Отправляем всем игрокам в мире
        io.to(user.worldId).emit('resourceAdded', resource);
    });

    // Добавление животного
    socket.on('addAnimal', (data) => {
        const user = users.get(socket.id);
        if (!user) return;

        const world = gameWorlds.get(user.worldId);
        if (!world) return;

        const animal = {
            id: uuidv4(),
            type: data.type,
            x: data.x,
            y: data.y,
            health: 100,
            hunger: 50,
            owner: socket.id,
            tamed: false,
            createdAt: Date.now()
        };

        world.animals.push(animal);

        io.to(user.worldId).emit('animalAdded', animal);
    });

    // Добавление хищника
    socket.on('addPredator', (data) => {
        const user = users.get(socket.id);
        if (!user) return;

        const world = gameWorlds.get(user.worldId);
        if (!world) return;

        const predator = {
            id: uuidv4(),
            type: data.type,
            x: data.x,
            y: data.y,
            health: 100,
            hunger: 50,
            target: null,
            createdAt: Date.now()
        };

        world.predators.push(predator);

        io.to(user.worldId).emit('predatorAdded', predator);
    });

    // Обновление агента
    socket.on('agentUpdate', (data) => {
        const user = users.get(socket.id);
        if (!user) return;

        const world = gameWorlds.get(user.worldId);
        if (!world) return;

        // Находим агента в мире
        const agentIndex = world.agents.findIndex(a => a.id === data.id);
        if (agentIndex !== -1) {
            world.agents[agentIndex] = { ...world.agents[agentIndex], ...data };
        } else {
            // Создаем нового агента
            world.agents.push({
                id: data.id || uuidv4(),
                ...data,
                owner: socket.id
            });
        }

        // Отправляем обновление всем остальным игрокам
        socket.to(user.worldId).emit('agentUpdated', {
            id: data.id,
            ...data
        });
    });

    // Удаление ресурса (когда игрок подобрал)
    socket.on('removeResource', (data) => {
        const user = users.get(socket.id);
        if (!user) return;

        const world = gameWorlds.get(user.worldId);
        if (!world) return;

        const resourceIndex = world.resources.findIndex(r => r.id === data.resourceId);
        if (resourceIndex !== -1) {
            world.resources.splice(resourceIndex, 1);
            io.to(user.worldId).emit('resourceRemoved', { resourceId: data.resourceId });
        }
    });

    // Создание костра
    socket.on('buildFire', (data) => {
        const user = users.get(socket.id);
        if (!user) return;

        const world = gameWorlds.get(user.worldId);
        if (!world) return;

        const fire = {
            id: uuidv4(),
            x: data.x,
            y: data.y,
            intensity: 1.0,
            owner: socket.id,
            createdAt: Date.now()
        };

        world.fires.push(fire);
        io.to(user.worldId).emit('fireBuilt', fire);
    });

    // Создание постройки
    socket.on('buildStructure', (data) => {
        const user = users.get(socket.id);
        if (!user) return;

        const world = gameWorlds.get(user.worldId);
        if (!world) return;

        const building = {
            id: uuidv4(),
            type: data.type,
            x: data.x,
            y: data.y,
            owner: socket.id,
            createdAt: Date.now()
        };

        world.buildings.push(building);
        io.to(user.worldId).emit('structureBuilt', building);
    });

    // Перемещение объекта
    socket.on('moveObject', (data) => {
        const user = users.get(socket.id);
        if (!user) return;

        const world = gameWorlds.get(user.worldId);
        if (!world) return;

        // Обновляем позицию объекта в зависимости от типа
        if (data.objectType === 'resource') {
            const resource = world.resources.find(r => r.id === data.objectId);
            if (resource) {
                resource.x = data.x;
                resource.y = data.y;
            }
        } else if (data.objectType === 'animal') {
            const animal = world.animals.find(a => a.id === data.objectId);
            if (animal) {
                animal.x = data.x;
                animal.y = data.y;
            }
        }

        // Отправляем обновление всем игрокам
        io.to(user.worldId).emit('objectMoved', {
            objectType: data.objectType,
            objectId: data.objectId,
            x: data.x,
            y: data.y
        });
    });

    // Обновление погоды/времени
    socket.on('worldUpdate', (data) => {
        const user = users.get(socket.id);
        if (!user) return;

        const world = gameWorlds.get(user.worldId);
        if (!world) return;

        if (data.weather !== undefined) world.weather = data.weather;
        if (data.timeOfDay !== undefined) world.timeOfDay = data.timeOfDay;
        if (data.day !== undefined) world.day = data.day;

        io.to(user.worldId).emit('worldUpdated', {
            weather: world.weather,
            timeOfDay: world.timeOfDay,
            day: world.day
        });
    });

    // Отключение игрока
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            const world = gameWorlds.get(user.worldId);
            if (world) {
                world.players.delete(socket.id);
                
                // Уведомляем других игроков
                socket.to(user.worldId).emit('playerLeft', {
                    playerId: socket.id
                });

                // Удаляем агентов игрока (опционально)
                world.agents = world.agents.filter(a => a.owner !== socket.id);

                // Очищаем пустой мир
                cleanupWorld(user.worldId);
            }
            users.delete(socket.id);
        }
        console.log(`Игрок отключился: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📡 WebSocket сервер готов к подключениям`);
});
