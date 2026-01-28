// Модуль для работы с миром и canvas

class World {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = null;
        this.day = 1;
        this.timeOfDay = 'day'; // day, night (по умолчанию день для комфортного старта)
        this.weather = 'sunny'; // sunny, rain, night (по умолчанию солнечная погода для комфортного старта)
        this.isRunning = false;
        this.simulationSpeed = 5;
        this.animationFrameId = null;
        this.resources = [];
        this.fires = []; // Массив костров [{x, y, intensity}]
        this.animals = []; // Массив животных [{type, x, y, ...}]
        this.predators = []; // Массив хищников
        this.otherPlayersAgents = []; // Агенты других игроков для мультиплеера
        
        // Система камеры для бесконечного мира
        this.camera = {
            x: 0,
            y: 0,
            scale: 1.0
        };
        
        // Управление мышью
        this.mouse = {
            x: 0,
            y: 0,
            isDown: false,
            dragStart: null,
            draggedObject: null,
            hoveredObject: null
        };
        
        // Структура мира
        this.terrain = {
            forest: [],      // Массив деревьев
            pond: null,      // Пруд (объект с координатами и размерами)
            clearing: null, // Полянка (область)
            stones: [],     // Массив камней
            berryBushes: [] // Кусты с ягодами
        };
        
        // Инициализация canvas
        if (this.canvas) {
            this.setupCanvas();
        }
    }

    setupCanvas() {
        // Настройка контекста и размеров
        this.ctx = this.canvas.getContext('2d');
        
        // Установка размеров canvas
        const resizeCanvas = () => {
            const container = this.canvas.parentElement;
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Обработчики событий мыши
        this.setupMouseHandlers();
    }
    
    setupMouseHandlers() {
        if (!this.canvas) return;
        
        // Получение координат мыши с учетом камеры
        const getWorldCoords = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: (e.clientX - rect.left) / this.camera.scale + this.camera.x,
                y: (e.clientY - rect.top) / this.camera.scale + this.camera.y
            };
        };
        
        // Глобальные координаты мыши для подсказок
        this.mouseScreenX = 0;
        this.mouseScreenY = 0;
        
        // Наведение мыши
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseScreenX = e.clientX - rect.left;
            this.mouseScreenY = e.clientY - rect.top;
            this.canvas._lastMouseEvent = e; // Сохраняем событие для подсказок
            const worldCoords = getWorldCoords(e);
            this.mouse.x = worldCoords.x;
            this.mouse.y = worldCoords.y;
            
            // Поиск объекта под курсором
            this.mouse.hoveredObject = this.getObjectAt(worldCoords.x, worldCoords.y);
            
            // Перетаскивание объекта
            if (this.mouse.isDown && this.mouse.draggedObject) {
                this.mouse.draggedObject.x = worldCoords.x;
                this.mouse.draggedObject.y = worldCoords.y;
                if (this.mouse.draggedObject.position) {
                    this.mouse.draggedObject.position.x = worldCoords.x;
                    this.mouse.draggedObject.position.y = worldCoords.y;
                }
            }
            // Перемещение камеры
            else if (this.mouse.isDown && this.mouse.dragStart) {
                const rect = this.canvas.getBoundingClientRect();
                const dx = (e.clientX - this.mouse.dragStart.x) / this.camera.scale;
                const dy = (e.clientY - this.mouse.dragStart.y) / this.camera.scale;
                this.camera.x -= dx;
                this.camera.y -= dy;
                this.mouse.dragStart = { x: e.clientX, y: e.clientY };
            }
            
            this.draw(); // Перерисовка для обновления подсказок
        });
        
        // Нажатие мыши
        this.canvas.addEventListener('mousedown', (e) => {
            const worldCoords = getWorldCoords(e);
            this.mouse.isDown = true;
            
            // Проверяем, есть ли объект под курсором
            const obj = this.getObjectAt(worldCoords.x, worldCoords.y);
            if (obj) {
                this.mouse.draggedObject = obj;
            } else {
                // Начинаем перемещение камеры
                this.mouse.dragStart = { x: e.clientX, y: e.clientY };
            }
        });
        
        // Отпускание мыши
        this.canvas.addEventListener('mouseup', () => {
            this.mouse.isDown = false;
            this.mouse.draggedObject = null;
            this.mouse.dragStart = null;
        });
        
        // Выход мыши за пределы canvas
        this.canvas.addEventListener('mouseleave', () => {
            this.mouse.isDown = false;
            this.mouse.draggedObject = null;
            this.mouse.dragStart = null;
            this.mouse.hoveredObject = null;
        });
        
        // Масштабирование колесиком мыши
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.camera.scale *= delta;
            this.camera.scale = Math.max(0.5, Math.min(2.0, this.camera.scale));
            this.draw();
        });
        
        // ========== TOUCH СОБЫТИЯ ДЛЯ МОБИЛЬНЫХ ==========
        let touchStart = null;
        let touchStartTime = 0;
        let lastTouchDistance = 0;
        let isPinching = false;
        
        // Получение координат касания с учетом камеры
        const getTouchCoords = (touch) => {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: (touch.clientX - rect.left) / this.camera.scale + this.camera.x,
                y: (touch.clientY - rect.top) / this.camera.scale + this.camera.y
            };
        };
        
        // Начало касания
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                // Одно касание - клик или начало перетаскивания
                const touch = e.touches[0];
                touchStart = { x: touch.clientX, y: touch.clientY };
                touchStartTime = Date.now();
                this.mouse.isDown = true;
                
                const worldCoords = getTouchCoords(touch);
                const obj = this.getObjectAt(worldCoords.x, worldCoords.y);
                if (obj) {
                    this.mouse.draggedObject = obj;
                } else {
                    this.mouse.dragStart = { x: touch.clientX, y: touch.clientY };
                }
            } else if (e.touches.length === 2) {
                // Два касания - масштабирование
                isPinching = true;
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                lastTouchDistance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) +
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );
            }
        });
        
        // Движение касания
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && touchStart) {
                // Перемещение камеры или объекта
                const touch = e.touches[0];
                const worldCoords = getTouchCoords(touch);
                this.mouse.x = worldCoords.x;
                this.mouse.y = worldCoords.y;
                
                if (this.mouse.draggedObject) {
                    this.mouse.draggedObject.x = worldCoords.x;
                    this.mouse.draggedObject.y = worldCoords.y;
                    if (this.mouse.draggedObject.position) {
                        this.mouse.draggedObject.position.x = worldCoords.x;
                        this.mouse.draggedObject.position.y = worldCoords.y;
                    }
                } else if (this.mouse.dragStart) {
                    // Перемещение камеры
                    const dx = (touch.clientX - this.mouse.dragStart.x) / this.camera.scale;
                    const dy = (touch.clientY - this.mouse.dragStart.y) / this.camera.scale;
                    this.camera.x -= dx;
                    this.camera.y -= dy;
                    this.mouse.dragStart = { x: touch.clientX, y: touch.clientY };
                }
                
                this.draw();
            } else if (e.touches.length === 2 && isPinching) {
                // Масштабирование
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const distance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) +
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );
                const scaleChange = distance / lastTouchDistance;
                this.camera.scale *= scaleChange;
                this.camera.scale = Math.max(0.5, Math.min(2.0, this.camera.scale));
                lastTouchDistance = distance;
                this.draw();
            }
        });
        
        // Конец касания
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (e.touches.length === 0) {
                // Все касания закончились
                if (touchStart) {
                    const timeDiff = Date.now() - touchStartTime;
                    const touch = e.changedTouches[0];
                    
                    // Если это был быстрый клик (менее 300мс и движение менее 10px)
                    if (timeDiff < 300 && touch) {
                        const dx = Math.abs(touch.clientX - touchStart.x);
                        const dy = Math.abs(touch.clientY - touchStart.y);
                        if (dx < 10 && dy < 10) {
                            // Это клик - обрабатываем как клик мыши
                            const worldCoords = getTouchCoords(touch);
                            this.handleClick(worldCoords.x, worldCoords.y);
                        }
                    }
                }
                
                touchStart = null;
                this.mouse.isDown = false;
                this.mouse.draggedObject = null;
                this.mouse.dragStart = null;
                isPinching = false;
            } else if (e.touches.length === 1) {
                // Осталось одно касание - продолжаем перетаскивание
                isPinching = false;
            }
        });
        
        // Отмена касания
        this.canvas.addEventListener('touchcancel', () => {
            touchStart = null;
            this.mouse.isDown = false;
            this.mouse.draggedObject = null;
            this.mouse.dragStart = null;
            isPinching = false;
        });
    }
    
    // Обработка клика (используется и для мыши, и для touch)
    handleClick(x, y) {
        // Эта функция будет вызываться из main.js для обработки кликов на агентов
        if (window.simulation && window.simulation.handleCanvasClick) {
            window.simulation.handleCanvasClick(x, y);
        }
    }
    
    getObjectAt(x, y) {
        const searchRadius = 20 / this.camera.scale; // Учитываем масштаб
        
        // Проверяем агентов
        if (window.agents) {
            const agents = window.agents.getAllAgents();
            for (let agent of agents) {
                const ax = agent.position ? agent.position.x : agent.x;
                const ay = agent.position ? agent.position.y : agent.y;
                const dist = Math.sqrt(Math.pow(ax - x, 2) + Math.pow(ay - y, 2));
                if (dist < searchRadius) {
                    return { type: 'agent', obj: agent, name: agent.name };
                }
            }
        }
        
        // Проверяем животных
        for (let animal of this.animals) {
            const dist = Math.sqrt(Math.pow(animal.x - x, 2) + Math.pow(animal.y - y, 2));
            if (dist < searchRadius) {
                return { type: 'animal', obj: animal, name: this.getAnimalName(animal.type) };
            }
        }
        
        // Проверяем хищников
        for (let predator of this.predators) {
            const dist = Math.sqrt(Math.pow(predator.x - x, 2) + Math.pow(predator.y - y, 2));
            if (dist < searchRadius) {
                return { type: 'predator', obj: predator, name: this.getPredatorName(predator.type) };
            }
        }
        
        // Проверяем ресурсы
        for (let resource of this.resources) {
            const dist = Math.sqrt(Math.pow(resource.x - x, 2) + Math.pow(resource.y - y, 2));
            if (dist < searchRadius) {
                return { type: 'resource', obj: resource, name: this.getResourceDisplayName(resource.type) };
            }
        }
        
        // Проверяем костры
        for (let fire of this.fires) {
            const dist = Math.sqrt(Math.pow(fire.x - x, 2) + Math.pow(fire.y - y, 2));
            if (dist < 15 / this.camera.scale) {
                return { type: 'fire', obj: fire, name: 'Костер' };
            }
        }
        
        return null;
    }
    
    getAnimalName(type) {
        const names = {
            'cow': 'Корова',
            'bull': 'Бык',
            'goat': 'Коза',
            'sheep': 'Овца',
            'rooster': 'Петух',
            'chicken': 'Курица',
            'cat': 'Кошка'
        };
        return names[type] || type;
    }
    
    getPredatorName(type) {
        const names = {
            'wolf': 'Волк',
            'bear': 'Медведь',
            'fox': 'Лиса'
        };
        return names[type] || type;
    }
    
    getResourceDisplayName(type) {
        const names = {
            'saw': 'Пила',
            'axe': 'Топор',
            'hammer': 'Молоток',
            'pickaxe': 'Кирка',
            'shovel': 'Лопата',
            'fishing_rod': 'Удочка',
            'berries': 'Ягоды',
            'wood': 'Дрова',
            'money': 'Деньги',
            'cooked_food': 'Готовая еда',
            'meat': 'Мясо',
            'bird': 'Птица',
            'fish': 'Рыба'
        };
        return names[type] || type;
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.animate();
        }
    }

    pause() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    reset() {
        this.pause();
        this.day = 1;
        this.timeOfDay = 'day';
        this.weather = 'sunny';
        this.resources = [];
        this.fires = []; // Очищаем костры
        this.animals = []; // Очищаем животных
        this.predators = []; // Очищаем хищников
        this.generateTerrain();
        this.updateUI();
        this.draw();
    }

    addFire(x, y, ownerId = null) {
        // Добавление костра на карту
        const fire = {
            x: x,
            y: y,
            intensity: 1.0, // Интенсивность костра (для анимации)
            time: Date.now(), // Время создания для анимации
            id: 'fire_' + Date.now() + '_' + Math.random(), // Уникальный ID для синхронизации
            wood: 5, // Количество дров в костре
            maxWood: 20, // Максимальное количество дров
            ownerId: ownerId, // Владелец костра
            heatRadius: 80 // Радиус действия тепла
        };
        this.fires.push(fire);
        this.draw();
    }
    
    // Добавить дрова в костер
    addWoodToFire(fireId, amount = 1) {
        const fire = this.fires.find(f => f.id === fireId);
        if (fire) {
            fire.wood = Math.min(fire.maxWood, fire.wood + amount);
            fire.intensity = Math.min(2.0, fire.intensity + 0.1);
            fire.heatRadius = 80 + (fire.wood * 2); // Увеличиваем радиус с количеством дров
            return true;
        }
        return false;
    }
    
    // Обновление костров (потребление дров)
    updateFires() {
        this.fires.forEach(fire => {
            // Дрова прогорают со временем
            fire.wood -= 0.01; // Скорость прогорания
            if (fire.wood < 0) fire.wood = 0;
            
            // Интенсивность уменьшается с дровами
            fire.intensity = Math.max(0.1, fire.wood / 10);
            fire.heatRadius = 80 + (fire.wood * 2);
            
            // Если дрова закончились - костер тухнет
            if (fire.wood <= 0 && fire.intensity < 0.2) {
                const index = this.fires.indexOf(fire);
                if (index > -1) {
                    this.fires.splice(index, 1);
                    if (window.addLogEntry) {
                        window.addLogEntry('🔥 Костер потух');
                    }
                }
            }
        });
    }

    addAnimal(type) {
        // Добавление животного на случайную позицию в видимой области
        if (!this.canvas) return;
        
        // Вычисляем размеры видимой области
        const viewWidth = this.canvas.width / this.camera.scale;
        const viewHeight = this.canvas.height / this.camera.scale;
        
        // Случайная позиция в видимой области с отступом от краев
        const margin = 50;
        const x = this.camera.x + margin + Math.random() * (viewWidth - margin * 2);
        const y = this.camera.y + margin + Math.random() * (viewHeight - margin * 2);
        
        const animalId = 'animal_' + Date.now() + '_' + Math.random();
        
        // Определяем скорость в зависимости от типа животного
        const animalSpeeds = {
            'cow': 0.5, 'goat': 1, 'sheep': 0.8, 'rooster': 1.2, 
            'chicken': 1, 'cat': 1.5, 'bull': 0.4
        };
        
        const animal = {
            id: animalId,
            type: type,
            x: x,
            y: y,
            direction: Math.random() * Math.PI * 2, // Направление движения
            speed: animalSpeeds[type] || 1, // Скорость движения
            size: this.getAnimalSize(type),
            health: 100,
            hunger: 50,
            owner: null, // Владелец (если домашнее животное)
            tamed: false // Приручено ли животное
        };
        
        this.animals.push(animal);
        this.draw();
    }
    
    addPredator(type) {
        // Добавление хищника на случайную позицию в видимой области
        if (!this.canvas) return;
        
        // Вычисляем размеры видимой области
        const viewWidth = this.canvas.width / this.camera.scale;
        const viewHeight = this.canvas.height / this.camera.scale;
        
        // Случайная позиция в видимой области с отступом от краев
        const margin = 50;
        const x = this.camera.x + margin + Math.random() * (viewWidth - margin * 2);
        const y = this.camera.y + margin + Math.random() * (viewHeight - margin * 2);
        
        const predatorId = 'predator_' + Date.now() + '_' + Math.random();
        
        // Определяем скорость и размер в зависимости от типа хищника
        const predatorData = {
            'wolf': { speed: 2, size: 15 },
            'bear': { speed: 1.5, size: 25 },
            'fox': { speed: 2.5, size: 12 }
        };
        const data = predatorData[type] || { speed: 2, size: 15 };
        
        this.predators.push({
            id: predatorId,
            type: type,
            x: x,
            y: y,
            direction: Math.random() * Math.PI * 2,
            speed: data.speed,
            size: data.size,
            speed: 1.0 + Math.random() * 0.5,
            size: type === 'bear' ? 25 : (type === 'wolf' ? 18 : 12),
            health: 100,
            hunger: 50,
            target: null // Цель для атаки
        });
        this.draw();
    }
    
    getAnimalSize(type) {
        const sizes = {
            'cow': 20,
            'bull': 22,
            'goat': 12,
            'sheep': 15,
            'rooster': 8,
            'chicken': 7,
            'cat': 6
        };
        return sizes[type] || 10;
    }

    setSimulationSpeed(speed) {
        this.simulationSpeed = speed;
    }

    setWeather(weather) {
        this.weather = weather;
        if (weather === 'night') {
            this.timeOfDay = 'night';
        } else if (weather === 'sunny') {
            this.timeOfDay = 'day';
        }
        this.updateUI();
        this.draw();
    }

    generateTerrain() {
        if (!this.canvas) return;
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Генерация леса (деревья) - больше деревьев для бесконечного мира
        this.terrain.forest = [];
        const treeCount = 150; // Увеличено для красивого леса
        const worldSize = Math.max(width, height) * 3; // Генерируем в большем диапазоне
        
        // Минимальное и максимальное расстояние между деревьями
        const minDistance = 20; // Минимальное расстояние между деревьями (пиксели)
        const maxDistance = 40; // Максимальное расстояние между деревьями (пиксели)
        const targetDistance = (minDistance + maxDistance) / 2; // Целевое расстояние (30 пикселей)
        
        // Генерируем деревья группами для более реалистичного леса
        const forestGroups = 8; // Количество групп деревьев
        for (let group = 0; group < forestGroups; group++) {
            const groupX = (Math.random() - 0.5) * worldSize;
            const groupY = (Math.random() - 0.5) * worldSize;
            const groupSize = 15 + Math.random() * 10; // Размер группы
            
            const treesInGroup = Math.floor(treeCount / forestGroups) + Math.floor(Math.random() * 5);
            const treesInThisGroup = []; // Массив деревьев в текущей группе
            
            for (let i = 0; i < treesInGroup; i++) {
                const age = Math.random() * 150; // Случайный возраст от 0 до 150 дней
                let state = 'young';
                if (age >= 200) state = 'dead_stump';
                else if (age >= 100) state = 'old';
                else if (age >= 30) state = 'mature';
                
                // Пытаемся разместить дерево с правильным расстоянием
                let attempts = 0;
                let treeX, treeY;
                let validPosition = false;
                
                while (!validPosition && attempts < 50) {
                    // Генерируем случайную позицию в группе
                    const offsetX = (Math.random() - 0.5) * groupSize;
                    const offsetY = (Math.random() - 0.5) * groupSize;
                    treeX = groupX + offsetX;
                    treeY = groupY + offsetY;
                    
                    // Проверяем расстояние до всех существующих деревьев
                    validPosition = true;
                    for (const existingTree of [...this.terrain.forest, ...treesInThisGroup]) {
                        const dx = treeX - existingTree.x;
                        const dy = treeY - existingTree.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        // Если дерево слишком близко или слишком далеко - позиция невалидна
                        if (distance < minDistance || (distance < maxDistance && Math.random() > 0.3)) {
                            validPosition = false;
                            break;
                        }
                    }
                    
                    attempts++;
                }
                
                // Если не удалось найти валидную позицию за 50 попыток, размещаем дерево с минимальным расстоянием
                if (!validPosition) {
                    // Ищем позицию рядом с существующим деревом, но на правильном расстоянии
                    if (treesInThisGroup.length > 0) {
                        const lastTree = treesInThisGroup[treesInThisGroup.length - 1];
                        const angle = Math.random() * Math.PI * 2;
                        const distance = minDistance + Math.random() * (maxDistance - minDistance);
                        treeX = lastTree.x + Math.cos(angle) * distance;
                        treeY = lastTree.y + Math.sin(angle) * distance;
                    } else if (this.terrain.forest.length > 0) {
                        const lastTree = this.terrain.forest[this.terrain.forest.length - 1];
                        const angle = Math.random() * Math.PI * 2;
                        const distance = minDistance + Math.random() * (maxDistance - minDistance);
                        treeX = lastTree.x + Math.cos(angle) * distance;
                        treeY = lastTree.y + Math.sin(angle) * distance;
                    } else {
                        // Первое дерево - размещаем случайно
                        treeX = groupX + (Math.random() - 0.5) * groupSize;
                        treeY = groupY + (Math.random() - 0.5) * groupSize;
                    }
                }
                
                const newTree = {
                    x: treeX,
                    y: treeY,
                    size: 12 + Math.random() * 25, // Размер дерева (увеличен для больших деревьев)
                    age: age,
                    state: state,
                    id: 'tree_' + Date.now() + '_' + group + '_' + i,
                    woodAmount: state === 'mature' ? 3 + Math.floor(Math.random() * 3) : 
                               state === 'old' ? 2 + Math.floor(Math.random() * 2) : 
                               state === 'young' ? 1 : 0 // Количество дров при рубке
                };
                
                treesInThisGroup.push(newTree);
                this.terrain.forest.push(newTree);
            }
        }
        
        // Создание пруда (овал в центре начальной области)
        this.terrain.pond = {
            centerX: 0,
            centerY: 0,
            radiusX: width * 0.15,
            radiusY: height * 0.12,
            reeds: [] // Камыши вокруг пруда
        };
        
        // Генерируем камыши вокруг пруда
        const reedCount = 20; // Количество камышей
        for (let i = 0; i < reedCount; i++) {
            const angle = (i / reedCount) * Math.PI * 2;
            const distance = this.terrain.pond.radiusX + 10 + Math.random() * 20;
            const reedX = this.terrain.pond.centerX + Math.cos(angle) * distance;
            const reedY = this.terrain.pond.centerY + Math.sin(angle) * distance;
            this.terrain.pond.reeds.push({
                x: reedX,
                y: reedY,
                height: 15 + Math.random() * 10,
                width: 2 + Math.random() * 2
            });
        }
        
        // Полянка (область вокруг пруда)
        this.terrain.clearing = {
            centerX: 0,
            centerY: 0,
            radius: Math.min(width, height) * 0.2
        };
        
        // Генерация камней
        this.terrain.stones = [];
        const stoneCount = 50; // Увеличено
        for (let i = 0; i < stoneCount; i++) {
            this.terrain.stones.push({
                x: (Math.random() - 0.5) * worldSize,
                y: (Math.random() - 0.5) * worldSize,
                size: 5 + Math.random() * 8
            });
        }
        
        // Генерация кустов с ягодами
        this.terrain.berryBushes = [];
        const bushCount = 40; // Увеличено
        for (let i = 0; i < bushCount; i++) {
            const x = (Math.random() - 0.5) * worldSize;
            const y = (Math.random() - 0.5) * worldSize;
            // Проверяем, чтобы кусты не попадали в пруд
            const distToPond = Math.sqrt(
                Math.pow(x - this.terrain.pond.centerX, 2) + 
                Math.pow(y - this.terrain.pond.centerY, 2)
            );
            if (distToPond > this.terrain.pond.radiusX + 30) {
                this.terrain.berryBushes.push({
                    x: x,
                    y: y,
                    berries: 5 + Math.floor(Math.random() * 10) // Количество ягод
                });
                // Добавляем ягоды в ресурсы
                this.resources.push({
                    type: 'berries',
                    x: x,
                    y: y,
                    amount: 5 + Math.floor(Math.random() * 10)
                });
            }
        }
    }

    addResource(type, count = 1) {
        // Добавление ресурса на случайную позицию в видимой области
        if (!this.canvas) return;
        
        // Вычисляем размеры видимой области
        const viewWidth = this.canvas.width / this.camera.scale;
        const viewHeight = this.canvas.height / this.camera.scale;
        
        // Добавляем указанное количество ресурсов
        for (let i = 0; i < count; i++) {
            // Случайная позиция в видимой области с отступом от краев
            const margin = 50;
            const x = this.camera.x + margin + Math.random() * (viewWidth - margin * 2);
            const y = this.camera.y + margin + Math.random() * (viewHeight - margin * 2);
            
            // Определяем количество в зависимости от типа
            let amount = 1;
            if (type === 'berries') amount = 10;
            else if (['meat', 'bird', 'fish', 'cooked_food', 'kebab', 'bread', 'honey', 'milk', 'water', 'tea', 'spices', 'mint', 'st_johns_wort', 'rosehip'].includes(type)) amount = 1;
            else if (type === 'money') amount = 10 + Math.floor(Math.random() * 50);
            else if (type === 'wood') amount = 5;
            else if (['potato', 'salad', 'mushrooms', 'cabbage'].includes(type)) amount = 1 + Math.floor(Math.random() * 3);
            else if (['banana', 'orange', 'apple', 'lemon'].includes(type)) amount = 1 + Math.floor(Math.random() * 2);
            else if (type === 'ammo') amount = 10; // Патроны - по 10 штук
            else if (type === 'arrows') amount = 10; // Стрелы - по 10 штук
            
            const resource = {
                type: type,
                x: x,
                y: y,
                amount: amount,
                id: 'resource_' + Date.now() + '_' + Math.random() + '_' + i, // Уникальный ID для синхронизации
                berryOffsets: null // Для фиксации позиций ягод
            };
            
            // Если это ягоды - генерируем фиксированные смещения один раз
            if (type === 'berries' && !resource.berryOffsets) {
                resource.berryOffsets = [];
                const berryCount = 5;
                for (let j = 0; j < berryCount; j++) {
                    resource.berryOffsets.push({
                        x: (Math.random() - 0.5) * 8,
                        y: (Math.random() - 0.5) * 8
                    });
                }
            }
            
            this.resources.push(resource);
        }
        
        this.draw();
    }

    getResourceAt(x, y) {
        // Проверяет, есть ли ресурс в указанных координатах
        const searchRadius = 15; // Радиус поиска
        
        for (let i = 0; i < this.resources.length; i++) {
            const resource = this.resources[i];
            const distance = Math.sqrt(
                Math.pow(resource.x - x, 2) + 
                Math.pow(resource.y - y, 2)
            );
            
            if (distance <= searchRadius) {
                return resource;
            }
        }
        
        return null;
    }

    updateUI() {
        const dayValue = document.getElementById('dayValue');
        const timeOfDayValue = document.getElementById('timeOfDayValue');
        const weatherSelect = document.getElementById('weatherSelect');

        if (dayValue) dayValue.textContent = this.day;
        if (timeOfDayValue) {
            timeOfDayValue.textContent = this.timeOfDay === 'day' ? 'День' : 'Ночь';
        }
        if (weatherSelect) weatherSelect.value = this.weather;
    }

    draw() {
        if (!this.ctx || !this.canvas) {
            console.warn('Canvas или контекст не готовы для отрисовки');
            return;
        }

        const width = this.canvas.width;
        const height = this.canvas.height;
        
        if (width === 0 || height === 0) {
            console.warn('Canvas имеет нулевой размер:', width, height);
            return;
        }

        // Очистка canvas (ВАЖНО: до применения трансформаций!)
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Сбрасываем все трансформации
        this.ctx.clearRect(0, 0, width, height);
        
        // Применяем трансформацию камеры
        this.ctx.save();
        this.ctx.scale(this.camera.scale, this.camera.scale);
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Вычисляем видимую область мира
        const viewLeft = this.camera.x;
        const viewTop = this.camera.y;
        const viewRight = viewLeft + width / this.camera.scale;
        const viewBottom = viewTop + height / this.camera.scale;
        const viewWidth = viewRight - viewLeft;
        const viewHeight = viewBottom - viewTop;
        
        // Фон (трава/поляна) в зависимости от времени суток и погоды - для видимой области
        if (this.weather === 'night' || this.timeOfDay === 'night') {
            // Ночь - темно-синий фон
            this.ctx.fillStyle = '#0a0a1a';
        } else if (this.weather === 'rain') {
            // Дождь - темно-зеленый
            this.ctx.fillStyle = '#1a3a1a';
        } else {
            // День - реалистичный зеленый цвет травы
            const gradient = this.ctx.createLinearGradient(viewLeft, viewTop, viewLeft, viewBottom);
            gradient.addColorStop(0, '#5a8a4a'); // Светлее сверху
            gradient.addColorStop(1, '#2a5a2a'); // Темнее снизу
            this.ctx.fillStyle = gradient;
        }
        this.ctx.fillRect(viewLeft, viewTop, viewWidth, viewHeight);
        
        // Текстура травы (маленькие точки) для видимой области
        if (this.weather !== 'night' && this.timeOfDay !== 'night') {
            this.ctx.fillStyle = 'rgba(100, 150, 80, 0.3)';
            const grassCount = Math.floor((viewWidth * viewHeight) / 1000);
            for (let i = 0; i < grassCount; i++) {
                const grassX = viewLeft + Math.random() * viewWidth;
                const grassY = viewTop + Math.random() * viewHeight;
                this.ctx.fillRect(grassX, grassY, 1, 2);
            }
        }

        // Отрисовка полянки (светлее фон, более реалистично)
        if (this.terrain.clearing) {
            const clearingGradient = this.ctx.createRadialGradient(
                this.terrain.clearing.centerX,
                this.terrain.clearing.centerY,
                0,
                this.terrain.clearing.centerX,
                this.terrain.clearing.centerY,
                this.terrain.clearing.radius
            );
            clearingGradient.addColorStop(0, 'rgba(120, 180, 100, 0.4)');
            clearingGradient.addColorStop(1, 'rgba(80, 140, 60, 0.2)');
            this.ctx.fillStyle = clearingGradient;
            this.ctx.beginPath();
            this.ctx.arc(
                this.terrain.clearing.centerX,
                this.terrain.clearing.centerY,
                this.terrain.clearing.radius,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        }

        // Отрисовка пруда (красивая визуализация с пляжем и камышами)
        if (this.terrain.pond) {
            const pond = this.terrain.pond;
            const beachWidth = 15; // Ширина пляжа (песчаного берега)
            
            // 1. Пляж (песчаный берег) - рисуем первым, чтобы он был под водой
            const beachGradient = this.ctx.createRadialGradient(
                pond.centerX,
                pond.centerY,
                Math.max(pond.radiusX, pond.radiusY),
                pond.centerX,
                pond.centerY,
                Math.max(pond.radiusX, pond.radiusY) + beachWidth
            );
            beachGradient.addColorStop(0, '#d4c5a9'); // Песок ближе к воде
            beachGradient.addColorStop(0.5, '#e8dcc0'); // Светлее песок
            beachGradient.addColorStop(1, '#f5ead8'); // Очень светлый песок
            
            this.ctx.fillStyle = beachGradient;
            this.ctx.beginPath();
            this.ctx.ellipse(
                pond.centerX,
                pond.centerY,
                pond.radiusX + beachWidth,
                pond.radiusY + beachWidth,
                0,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
            
            // Текстура песка (маленькие точки)
            this.ctx.fillStyle = 'rgba(200, 180, 150, 0.3)';
            for (let i = 0; i < 30; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.max(pond.radiusX, pond.radiusY) + Math.random() * beachWidth;
                const sandX = pond.centerX + Math.cos(angle) * dist;
                const sandY = pond.centerY + Math.sin(angle) * dist;
                this.ctx.beginPath();
                this.ctx.arc(sandX, sandY, 1 + Math.random(), 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // 2. Вода (красивая без белого фона)
            const waterGradient = this.ctx.createRadialGradient(
                pond.centerX - pond.radiusX * 0.2,
                pond.centerY - pond.radiusY * 0.2,
                0,
                pond.centerX,
                pond.centerY,
                Math.max(pond.radiusX, pond.radiusY)
            );
            waterGradient.addColorStop(0, '#5a9ab8'); // Светло-голубая в центре
            waterGradient.addColorStop(0.5, '#4a7a9a'); // Средняя голубая
            waterGradient.addColorStop(1, '#2a4a6a'); // Темно-синяя по краям
            
            this.ctx.fillStyle = waterGradient;
            this.ctx.beginPath();
            this.ctx.ellipse(
                pond.centerX,
                pond.centerY,
                pond.radiusX,
                pond.radiusY,
                0,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
            
            // 3. Береговая линия (граница между водой и пляжем)
            this.ctx.strokeStyle = '#3a5a4a';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.ellipse(
                pond.centerX,
                pond.centerY,
                pond.radiusX,
                pond.radiusY,
                0,
                0,
                Math.PI * 2
            );
            this.ctx.stroke();
            
            // 4. Рябь на воде (анимированная)
            const time = Date.now() / 1000;
            this.ctx.fillStyle = 'rgba(150, 200, 255, 0.15)';
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 + time * 0.5;
                const rippleRadius = 5 + Math.sin(time * 2 + i) * 3;
                const rippleX = pond.centerX + Math.cos(angle) * (pond.radiusX * 0.6);
                const rippleY = pond.centerY + Math.sin(angle) * (pond.radiusY * 0.6);
                this.ctx.beginPath();
                this.ctx.arc(rippleX, rippleY, rippleRadius, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // 5. Отражения света на воде
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            for (let i = 0; i < 3; i++) {
                const lightX = pond.centerX + (Math.random() - 0.5) * pond.radiusX * 0.5;
                const lightY = pond.centerY + (Math.random() - 0.5) * pond.radiusY * 0.5;
                const lightGradient = this.ctx.createRadialGradient(
                    lightX, lightY, 0,
                    lightX, lightY, 15
                );
                lightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
                lightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                this.ctx.fillStyle = lightGradient;
                this.ctx.beginPath();
                this.ctx.arc(lightX, lightY, 15, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // 6. Камыши вокруг пруда
            if (pond.reeds && pond.reeds.length > 0) {
                pond.reeds.forEach(reed => {
                    // Стебель камыша
                    const reedGradient = this.ctx.createLinearGradient(
                        reed.x - reed.width / 2, reed.y,
                        reed.x + reed.width / 2, reed.y - reed.height
                    );
                    reedGradient.addColorStop(0, '#4a5a3a');
                    reedGradient.addColorStop(0.5, '#5a6a4a');
                    reedGradient.addColorStop(1, '#6a7a5a');
                    
                    this.ctx.fillStyle = reedGradient;
                    this.ctx.beginPath();
                    this.ctx.ellipse(
                        reed.x,
                        reed.y - reed.height / 2,
                        reed.width / 2,
                        reed.height / 2,
                        Math.random() * 0.3 - 0.15,
                        0,
                        Math.PI * 2
                    );
                    this.ctx.fill();
                    
                    // Колосок камыша
                    this.ctx.fillStyle = '#8a7a5a';
                    this.ctx.beginPath();
                    this.ctx.ellipse(
                        reed.x,
                        reed.y - reed.height,
                        reed.width * 1.5,
                        reed.width * 0.8,
                        Math.random() * 0.2 - 0.1,
                        0,
                        Math.PI * 2
                    );
                    this.ctx.fill();
                    
                    // Листья камыша (несколько)
                    this.ctx.strokeStyle = '#5a6a4a';
                    this.ctx.lineWidth = 1.5;
                    for (let i = 0; i < 2; i++) {
                        const leafAngle = (i - 0.5) * 0.4;
                        const leafLength = reed.height * 0.6;
                        this.ctx.beginPath();
                        this.ctx.moveTo(reed.x, reed.y);
                        this.ctx.quadraticCurveTo(
                            reed.x + Math.cos(leafAngle) * leafLength * 0.5,
                            reed.y - leafLength * 0.3,
                            reed.x + Math.cos(leafAngle) * leafLength,
                            reed.y - leafLength
                        );
                        this.ctx.stroke();
                    }
                });
            }
        }

        // Отрисовка леса (красивые реалистичные деревья)
        this.terrain.forest.forEach(tree => {
            if (!tree) return;
            
            const state = tree.state || 'mature';
            const trunkHeight = tree.size * 0.65;
            const trunkWidth = 5 + tree.size * 0.12;
            
            // Тень дерева (более реалистичная)
            const shadowGradient = this.ctx.createRadialGradient(
                tree.x + 3, tree.y + trunkHeight + 2, 0,
                tree.x + 3, tree.y + trunkHeight + 2, tree.size * 0.4
            );
            shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
            shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            this.ctx.fillStyle = shadowGradient;
            this.ctx.beginPath();
            this.ctx.ellipse(tree.x + 3, tree.y + trunkHeight + 2, tree.size * 0.35, tree.size * 0.18, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Ствол дерева (улучшенная визуализация с градиентом)
            const trunkGradient = this.ctx.createLinearGradient(
                tree.x - trunkWidth/2, tree.y,
                tree.x + trunkWidth/2, tree.y + trunkHeight
            );
            if (state === 'dead_stump') {
                trunkGradient.addColorStop(0, '#5a4a3a');
                trunkGradient.addColorStop(1, '#3a2a1a');
            } else {
                trunkGradient.addColorStop(0, '#8b6b4a'); // Светлее сверху
                trunkGradient.addColorStop(0.5, '#6b4a3a'); // Средний
                trunkGradient.addColorStop(1, '#4a3a2a'); // Темнее снизу
            }
            
            this.ctx.fillStyle = trunkGradient;
            this.ctx.fillRect(tree.x - trunkWidth/2, tree.y, trunkWidth, trunkHeight);
            
            // Текстура ствола (вертикальные линии коры)
            this.ctx.strokeStyle = state === 'dead_stump' ? '#3a2a1a' : '#5a3a2a';
            this.ctx.lineWidth = 1;
            for (let i = 0; i < Math.floor(trunkWidth / 2); i++) {
                const lineX = tree.x - trunkWidth/2 + i * 2.5;
                this.ctx.beginPath();
                this.ctx.moveTo(lineX, tree.y);
                this.ctx.lineTo(lineX, tree.y + trunkHeight);
                this.ctx.stroke();
            }
            
            // Горизонтальные линии коры (годовые кольца)
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            this.ctx.lineWidth = 0.5;
            for (let i = 1; i < 4; i++) {
                const ringY = tree.y + (trunkHeight / 4) * i;
                this.ctx.beginPath();
                this.ctx.moveTo(tree.x - trunkWidth/2, ringY);
                this.ctx.lineTo(tree.x + trunkWidth/2, ringY);
                this.ctx.stroke();
            }
            
            // Крона дерева в зависимости от состояния
            if (state !== 'dead_stump') {
                const crownRadius = tree.size * 0.55;
                
                if (state === 'young') {
                    // Молодое дерево - маленькая зеленая крона
                    const youngGradient = this.ctx.createRadialGradient(
                        tree.x, tree.y - 2, 0,
                        tree.x, tree.y - 2, crownRadius * 0.6
                    );
                    youngGradient.addColorStop(0, '#4a9a4a');
                    youngGradient.addColorStop(1, '#2a7a2a');
                    this.ctx.fillStyle = youngGradient;
                    this.ctx.beginPath();
                    this.ctx.arc(tree.x, tree.y - 2, crownRadius * 0.6, 0, Math.PI * 2);
                    this.ctx.fill();
                } else if (state === 'mature') {
                    // Зрелое дерево - полная крона (несколько слоев с градиентами)
                    // Внешний слой (темнее)
                    const outerGradient = this.ctx.createRadialGradient(
                        tree.x, tree.y - 2, crownRadius * 0.5,
                        tree.x, tree.y - 2, crownRadius
                    );
                    outerGradient.addColorStop(0, '#2a5a2a');
                    outerGradient.addColorStop(1, '#1a4a1a');
                    this.ctx.fillStyle = outerGradient;
                    this.ctx.beginPath();
                    this.ctx.arc(tree.x, tree.y - 2, crownRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Средний слой
                    const middleGradient = this.ctx.createRadialGradient(
                        tree.x - 2, tree.y - 4, crownRadius * 0.4,
                        tree.x - 2, tree.y - 4, crownRadius * 0.8
                    );
                    middleGradient.addColorStop(0, '#3a7a3a');
                    middleGradient.addColorStop(1, '#2a6a2a');
                    this.ctx.fillStyle = middleGradient;
                    this.ctx.beginPath();
                    this.ctx.arc(tree.x - 2, tree.y - 4, crownRadius * 0.8, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Внутренний слой (светлее)
                    const innerGradient = this.ctx.createRadialGradient(
                        tree.x + 2, tree.y - 3, 0,
                        tree.x + 2, tree.y - 3, crownRadius * 0.6
                    );
                    innerGradient.addColorStop(0, '#5a9a5a');
                    innerGradient.addColorStop(1, '#3a8a3a');
                    this.ctx.fillStyle = innerGradient;
                    this.ctx.beginPath();
                    this.ctx.arc(tree.x + 2, tree.y - 3, crownRadius * 0.6, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Детали листьев (маленькие точки)
                    this.ctx.fillStyle = 'rgba(100, 150, 100, 0.4)';
                    for (let i = 0; i < 8; i++) {
                        const angle = (i / 8) * Math.PI * 2;
                        const dist = crownRadius * (0.3 + Math.random() * 0.4);
                        const leafX = tree.x + Math.cos(angle) * dist;
                        const leafY = tree.y - 2 + Math.sin(angle) * dist;
                        this.ctx.beginPath();
                        this.ctx.arc(leafX, leafY, 1.5 + Math.random(), 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                } else if (state === 'old') {
                    // Старое дерево - частично голая крона
                    const oldGradient = this.ctx.createRadialGradient(
                        tree.x, tree.y - 2, crownRadius * 0.3,
                        tree.x, tree.y - 2, crownRadius * 0.7
                    );
                    oldGradient.addColorStop(0, '#3a6a3a');
                    oldGradient.addColorStop(1, '#1a4a1a');
                    this.ctx.fillStyle = oldGradient;
                    this.ctx.beginPath();
                    this.ctx.arc(tree.x, tree.y - 2, crownRadius * 0.7, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Средний слой (еще меньше)
                    this.ctx.fillStyle = '#2a5a2a';
                    this.ctx.beginPath();
                    this.ctx.arc(tree.x - 1, tree.y - 3, crownRadius * 0.5, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Показываем голые ветки
                    this.ctx.strokeStyle = '#5a4a3a';
                    this.ctx.lineWidth = 2;
                    for (let i = 0; i < 4; i++) {
                        const angle = (i * Math.PI * 2 / 4) + Math.PI / 2;
                        this.ctx.beginPath();
                        this.ctx.moveTo(tree.x, tree.y - 2);
                        const branchLength = crownRadius * (0.5 + Math.random() * 0.3);
                        this.ctx.lineTo(
                            tree.x + Math.cos(angle) * branchLength,
                            tree.y - 2 + Math.sin(angle) * branchLength
                        );
                        this.ctx.stroke();
                    }
                }
            } else {
                // Голый пень - только ствол, без кроны
                this.ctx.strokeStyle = '#4a3a2a';
                this.ctx.lineWidth = 2;
                for (let i = 0; i < 3; i++) {
                    const angle = (i * Math.PI * 2 / 3) + Math.PI / 4;
                    this.ctx.beginPath();
                    this.ctx.moveTo(tree.x, tree.y);
                    this.ctx.lineTo(
                        tree.x + Math.cos(angle) * 8,
                        tree.y + Math.sin(angle) * 8
                    );
                    this.ctx.stroke();
                }
            }
        });

        // Отрисовка камней (реалистичные)
        this.terrain.stones.forEach(stone => {
            // Тень камня
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.beginPath();
            this.ctx.ellipse(stone.x + 2, stone.y + 2, stone.size * 0.8, stone.size * 0.5, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Основной камень (градиент для объема)
            const stoneGradient = this.ctx.createRadialGradient(
                stone.x - stone.size * 0.3,
                stone.y - stone.size * 0.3,
                0,
                stone.x,
                stone.y,
                stone.size
            );
            stoneGradient.addColorStop(0, '#7a7a7a'); // Светлее
            stoneGradient.addColorStop(1, '#4a4a4a'); // Темнее
            
            this.ctx.fillStyle = stoneGradient;
            this.ctx.beginPath();
            this.ctx.arc(stone.x, stone.y, stone.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Текстура камня (темные линии)
            this.ctx.strokeStyle = '#3a3a3a';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.arc(stone.x, stone.y, stone.size * 0.7, 0, Math.PI * 1.5);
            this.ctx.stroke();
        });

        // Отрисовка кустов с ягодами (реалистичные)
        this.terrain.berryBushes.forEach(bush => {
            // Тень куста
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            this.ctx.beginPath();
            this.ctx.ellipse(bush.x + 1, bush.y + 1, 12, 6, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Куст (несколько слоев листьев)
            const bushRadius = 12;
            
            // Внешний слой (темнее)
            this.ctx.fillStyle = '#2a5a1a';
            this.ctx.beginPath();
            this.ctx.arc(bush.x, bush.y, bushRadius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Средний слой
            this.ctx.fillStyle = '#3a7a2a';
            this.ctx.beginPath();
            this.ctx.arc(bush.x - 2, bush.y - 1, bushRadius * 0.7, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Внутренний слой (светлее)
            this.ctx.fillStyle = '#4a9a3a';
            this.ctx.beginPath();
            this.ctx.arc(bush.x + 2, bush.y, bushRadius * 0.5, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Ягоды на кусте (реалистичные)
            if (bush.berries > 0) {
                const berryCount = Math.min(bush.berries, 8);
                for (let i = 0; i < berryCount; i++) {
                    const angle = (i / berryCount) * Math.PI * 2;
                    const berryX = bush.x + Math.cos(angle) * 8;
                    const berryY = bush.y + Math.sin(angle) * 7;
                    
                    // Тень ягоды
                    this.ctx.fillStyle = 'rgba(150, 0, 0, 0.5)';
                    this.ctx.beginPath();
                    this.ctx.arc(berryX + 1, berryY + 1, 3, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Ягода (градиент)
                    const berryGradient = this.ctx.createRadialGradient(
                        berryX - 1, berryY - 1, 0,
                        berryX, berryY, 3
                    );
                    berryGradient.addColorStop(0, '#ff6666');
                    berryGradient.addColorStop(1, '#cc0000');
                    
                    this.ctx.fillStyle = berryGradient;
                    this.ctx.beginPath();
                    this.ctx.arc(berryX, berryY, 3, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Блик на ягоде
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                    this.ctx.beginPath();
                    this.ctx.arc(berryX - 1, berryY - 1, 1, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        });

        // Отрисовка дополнительных ресурсов (ягоды и дрова, добавленные вручную)
        this.resources.forEach(resource => {
            if (resource.type === 'berries') {
                // Группа ягод (реалистичная)
                // Используем фиксированные смещения, если они есть, иначе генерируем один раз
                if (!resource.berryOffsets) {
                    resource.berryOffsets = [];
                    const berryCount = 5;
                    for (let i = 0; i < berryCount; i++) {
                        resource.berryOffsets.push({
                            x: (Math.random() - 0.5) * 8,
                            y: (Math.random() - 0.5) * 8
                        });
                    }
                }
                
                const berryCount = resource.berryOffsets.length;
                for (let i = 0; i < berryCount; i++) {
                    const offset = resource.berryOffsets[i];
                    const berryX = resource.x + offset.x;
                    const berryY = resource.y + offset.y;
                    
                    // Тень ягоды
                    this.ctx.fillStyle = 'rgba(150, 0, 0, 0.4)';
                    this.ctx.beginPath();
                    this.ctx.arc(berryX + 1, berryY + 1, 3, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Ягода (градиент)
                    const berryGradient = this.ctx.createRadialGradient(
                        berryX - 1, berryY - 1, 0,
                        berryX, berryY, 3
                    );
                    berryGradient.addColorStop(0, '#ff8888');
                    berryGradient.addColorStop(1, '#cc0000');
                    
                    this.ctx.fillStyle = berryGradient;
                    this.ctx.beginPath();
                    this.ctx.arc(berryX, berryY, 3, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Блик на ягоде
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    this.ctx.beginPath();
                    this.ctx.arc(berryX - 1, berryY - 1, 1, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            } else if (resource.type === 'wood') {
                // Дрова (реалистичные бревна)
                const logCount = 3;
                for (let i = 0; i < logCount; i++) {
                    const logX = resource.x - 6 + i * 4;
                    const logY = resource.y - 2 + (i % 2) * 2;
                    
                    // Тень бревна
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                    this.ctx.fillRect(logX + 1, logY + 1, 6, 3);
                    
                    // Бревно (градиент)
                    const woodGradient = this.ctx.createLinearGradient(logX, logY, logX + 6, logY);
                    woodGradient.addColorStop(0, '#9b6533');
                    woodGradient.addColorStop(0.5, '#8b4513');
                    woodGradient.addColorStop(1, '#6b3513');
                    
                    this.ctx.fillStyle = woodGradient;
                    this.ctx.fillRect(logX, logY, 6, 3);
                    
                    // Кольца на бревне
                    this.ctx.strokeStyle = '#5b2513';
                    this.ctx.lineWidth = 0.5;
                    this.ctx.beginPath();
                    this.ctx.arc(logX + 3, logY + 1.5, 1, 0, Math.PI * 2);
                    this.ctx.stroke();
                }
            } else {
                // Отрисовка других ресурсов
                this.drawResource(resource);
            }
        });

        // Отрисовка костров
        this.fires.forEach(fire => {
            this.drawFire(fire);
        });

        // Отрисовка животных
        this.animals.forEach(animal => {
            this.drawAnimal(animal);
        });

        // Отрисовка хищников
        this.predators.forEach(predator => {
            this.drawPredator(predator);
        });

        // Отрисовка предпросмотра пути (если рисуется)
        if (window.simulation && window.simulation.pathMode) {
            this.drawPathPreview();
        }
        
        // Отрисовка зданий
        this.drawBuildings();
        
        // Отрисовка агентов (если есть)
        if (window.agents) {
            const allAgents = window.agents.getAllAgents();
            allAgents.forEach(agent => {
                this.drawAgent(agent);
            });
            
            // Отрисовка активных путей агентов (кроме добычи ресурсов)
            allAgents.forEach(agent => {
                if (agent.pathType === 'direct' && agent.targetPosition) {
                    // Не рисуем путь для добычи ресурсов (gatherSupplies)
                    if (agent.state !== 'gatherSupplies' && !agent.targetSupplyResource) {
                        // Для прямого пути рисуем линию к цели
                        this.drawDirectPath(agent);
                    }
                }
            });
            
            // Рисуем агентов других игроков
            if (this.otherPlayersAgents) {
                this.otherPlayersAgents.forEach(agent => {
                    this.drawOtherPlayerAgent(agent);
                });
            }
        }
        
        // Восстанавливаем контекст (убираем трансформацию камеры)
        this.ctx.restore();
        
        // Отрисовка сетки и линейки поверх всего (если включено)
        if (window.showGrid) {
            this.drawGrid();
        }
        
        // Отрисовка подсказок поверх всего (в координатах экрана)
        if (this.mouse.hoveredObject) {
            this.drawTooltip(this.mouse.hoveredObject);
        }
    }
    
    // Отрисовка сетки и линейки
    drawGrid() {
        if (!this.ctx || !this.canvas) return;
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        const gridSize = 50; // Размер ячейки сетки в пикселях
        const rulerSize = 25; // Высота/ширина линейки
        
        // Вычисляем смещение камеры для правильного отображения координат
        const offsetX = this.camera.x * this.camera.scale;
        const offsetY = this.camera.y * this.camera.scale;
        const scale = this.camera.scale;
        
        // Рисуем полупрозрачный фон для линеек
        this.ctx.fillStyle = 'rgba(30, 30, 30, 0.8)';
        this.ctx.fillRect(0, 0, width, rulerSize); // Верхняя линейка
        this.ctx.fillRect(0, rulerSize, rulerSize, height - rulerSize); // Левая линейка
        
        // Настройки для сетки
        this.ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
        this.ctx.lineWidth = 1;
        
        // Вычисляем начальные координаты сетки с учетом камеры
        const startWorldX = Math.floor(this.camera.x / gridSize) * gridSize;
        const startWorldY = Math.floor(this.camera.y / gridSize) * gridSize;
        
        // Рисуем вертикальные линии сетки
        for (let worldX = startWorldX; worldX < this.camera.x + width / scale + gridSize; worldX += gridSize) {
            const screenX = (worldX - this.camera.x) * scale;
            if (screenX >= rulerSize && screenX <= width) {
                // Основная линия сетки
                const isMajor = worldX % (gridSize * 2) === 0;
                this.ctx.strokeStyle = isMajor ? 'rgba(100, 150, 200, 0.4)' : 'rgba(100, 100, 100, 0.2)';
                this.ctx.beginPath();
                this.ctx.moveTo(screenX, rulerSize);
                this.ctx.lineTo(screenX, height);
                this.ctx.stroke();
            }
        }
        
        // Рисуем горизонтальные линии сетки
        for (let worldY = startWorldY; worldY < this.camera.y + height / scale + gridSize; worldY += gridSize) {
            const screenY = (worldY - this.camera.y) * scale;
            if (screenY >= rulerSize && screenY <= height) {
                // Основная линия сетки
                const isMajor = worldY % (gridSize * 2) === 0;
                this.ctx.strokeStyle = isMajor ? 'rgba(100, 150, 200, 0.4)' : 'rgba(100, 100, 100, 0.2)';
                this.ctx.beginPath();
                this.ctx.moveTo(rulerSize, screenY);
                this.ctx.lineTo(width, screenY);
                this.ctx.stroke();
            }
        }
        
        // Настройки для текста линейки
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Рисуем метки на верхней линейке (координаты X)
        for (let worldX = startWorldX; worldX < this.camera.x + width / scale + gridSize; worldX += gridSize) {
            const screenX = (worldX - this.camera.x) * scale;
            if (screenX >= rulerSize && screenX <= width) {
                // Метка
                this.ctx.fillStyle = 'rgba(74, 158, 255, 0.9)';
                this.ctx.fillText(Math.round(worldX).toString(), screenX, rulerSize / 2);
                
                // Засечка
                this.ctx.strokeStyle = 'rgba(74, 158, 255, 0.6)';
                this.ctx.beginPath();
                this.ctx.moveTo(screenX, rulerSize - 5);
                this.ctx.lineTo(screenX, rulerSize);
                this.ctx.stroke();
            }
        }
        
        // Рисуем метки на левой линейке (координаты Y)
        this.ctx.textAlign = 'center';
        for (let worldY = startWorldY; worldY < this.camera.y + height / scale + gridSize; worldY += gridSize) {
            const screenY = (worldY - this.camera.y) * scale;
            if (screenY >= rulerSize && screenY <= height) {
                // Метка
                this.ctx.fillStyle = 'rgba(74, 158, 255, 0.9)';
                this.ctx.fillText(Math.round(worldY).toString(), rulerSize / 2, screenY);
                
                // Засечка
                this.ctx.strokeStyle = 'rgba(74, 158, 255, 0.6)';
                this.ctx.beginPath();
                this.ctx.moveTo(rulerSize - 5, screenY);
                this.ctx.lineTo(rulerSize, screenY);
                this.ctx.stroke();
            }
        }
        
        // Рисуем угловой квадрат с информацией о масштабе
        this.ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
        this.ctx.fillRect(0, 0, rulerSize, rulerSize);
        this.ctx.fillStyle = 'rgba(74, 158, 255, 0.9)';
        this.ctx.font = '8px Arial';
        this.ctx.fillText(`${Math.round(scale * 100)}%`, rulerSize / 2, rulerSize / 2);
        
        // Рисуем координаты мыши (если есть)
        if (this.mouseScreenX !== undefined && this.mouseScreenY !== undefined) {
            const worldMouseX = this.camera.x + this.mouseScreenX / scale;
            const worldMouseY = this.camera.y + this.mouseScreenY / scale;
            
            // Фон для координат
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(width - 120, height - 25, 115, 20);
            
            // Текст координат
            this.ctx.fillStyle = '#4a9eff';
            this.ctx.font = '11px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`X: ${Math.round(worldMouseX)} Y: ${Math.round(worldMouseY)}`, width - 115, height - 12);
        }
    }
    
    drawTooltip(obj) {
        if (!this.ctx || !this.canvas) return;
        
        // Используем сохраненные координаты мыши
        const screenX = this.mouseScreenX;
        const screenY = this.mouseScreenY;
        
        let name = obj.name || 'Неизвестно';
        let additionalInfo = '';
        
        // Дополнительная информация в зависимости от типа объекта
        if (obj.type === 'agent') {
            const agent = obj.obj;
            // Получаем русское название состояния
            let stateName = agent.state || 'explore';
            if (window.simulation && window.simulation.getStateName) {
                stateName = window.simulation.getStateName(stateName);
            } else {
                // Резервный перевод, если функция недоступна
                const stateNames = {
                    'explore': 'Исследует', 'findFood': 'Ищет еду', 'rest': 'Отдыхает', 'sleep': 'Спит',
                    'findHeat': 'Ищет тепло', 'buildFire': 'Разводит костер', 'defend': 'Обороняется',
                    'feedAnimal': 'Кормит животных', 'playWithPet': 'Играет с питомцем', 'storeFood': 'Запасает еду',
                    'moveToPoint': 'Двигается к цели', 'cook': 'Готовит еду', 'hunt': 'Охотится', 'build': 'Строит',
                    'fish': 'Ловит рыбу', 'farm': 'Занимается фермерством', 'heal': 'Лечит больного',
                    'findClothes': 'Ищет одежду', 'chop_wood': 'Рубит дерево', 'sing': 'Поет песни',
                    'tellStory': 'Рассказывает стихи', 'makeLaugh': 'Смешит других', 'console': 'Утешает',
                    'stayWithFriend': 'Находится с другом', 'gatherSupplies': 'Собирает запасы',
                    'recoverSelf': 'Восстанавливается', 'buildHouse': 'Строит жилище', 'buildPen': 'Строит загон',
                    'buildBarn': 'Строит сарай', 'findAnimals': 'Ищет животных', 'developFarm': 'Развивает ферму',
                    'findWater': 'Ищет воду', 'dead': 'Мертв', 'goToMarket': 'Идет на ярмарку'
                };
                stateName = stateNames[stateName] || stateName;
            }
            additionalInfo = ` (Состояние: ${stateName}, Здоровье: ${Math.floor(agent.health)}%, Голод: ${Math.floor(agent.hunger)}%)`;
        } else if (obj.type === 'animal') {
            const animal = obj.obj;
            if (animal.tamed) {
                additionalInfo = ' (Приручено)';
            }
            additionalInfo += ` (Здоровье: ${Math.floor(animal.health)}%, Голод: ${Math.floor(animal.hunger)}%)`;
        } else if (obj.type === 'predator') {
            const predator = obj.obj;
            additionalInfo = ` (Здоровье: ${Math.floor(predator.health)}%, Голод: ${Math.floor(predator.hunger)}%)`;
        } else if (obj.type === 'resource') {
            const resource = obj.obj;
            if (resource.amount) {
                additionalInfo = ` (Количество: ${resource.amount})`;
            }
        }
        
        const fullText = name + additionalInfo;
        const padding = 8;
        const fontSize = 12;
        
        this.ctx.font = `${fontSize}px Arial`;
        const textWidth = this.ctx.measureText(fullText).width;
        const tooltipWidth = textWidth + padding * 2;
        const tooltipHeight = fontSize + padding * 2;
        
        // Фон подсказки
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.fillRect(screenX - tooltipWidth / 2, screenY - tooltipHeight - 25, tooltipWidth, tooltipHeight);
        
        // Обводка подсказки
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(screenX - tooltipWidth / 2, screenY - tooltipHeight - 25, tooltipWidth, tooltipHeight);
        
        // Текст подсказки
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(fullText, screenX, screenY - 15);
        this.ctx.textAlign = 'left';
    }
    
    drawPredator(predator) {
        if (!this.ctx) return;
        
        const x = predator.x;
        const y = predator.y;
        const time = Date.now() / 1000;
        const size = predator.size || 15;
        
        // Анимация движения
        const walkOffset = Math.sin(time * 3 + predator.x * 0.1) * 2;
        
        // Тень
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(x + 2, y + size + 2, size * 0.6, size * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        switch(predator.type) {
            case 'wolf':
                // Волк
                this.ctx.fillStyle = '#4a4a4a';
                this.ctx.beginPath();
                this.ctx.ellipse(x, y + walkOffset, size * 0.6, size * 0.4, 0, 0, Math.PI * 2);
                this.ctx.fill();
                // Голова
                this.ctx.beginPath();
                this.ctx.arc(x - size * 0.4, y + walkOffset, size * 0.3, 0, Math.PI * 2);
                this.ctx.fill();
                // Уши
                this.ctx.beginPath();
                this.ctx.moveTo(x - size * 0.5, y - size * 0.2 + walkOffset);
                this.ctx.lineTo(x - size * 0.45, y - size * 0.4 + walkOffset);
                this.ctx.lineTo(x - size * 0.35, y - size * 0.2 + walkOffset);
                this.ctx.closePath();
                this.ctx.fill();
                // Глаза (красные)
                this.ctx.fillStyle = '#ff0000';
                this.ctx.beginPath();
                this.ctx.arc(x - size * 0.45, y + walkOffset, 2, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            case 'bear':
                // Медведь
                this.ctx.fillStyle = '#5a3a2a';
                this.ctx.beginPath();
                this.ctx.ellipse(x, y + walkOffset, size * 0.7, size * 0.5, 0, 0, Math.PI * 2);
                this.ctx.fill();
                // Голова
                this.ctx.beginPath();
                this.ctx.arc(x - size * 0.4, y + walkOffset, size * 0.35, 0, Math.PI * 2);
                this.ctx.fill();
                // Уши
                this.ctx.fillStyle = '#3a2a1a';
                this.ctx.beginPath();
                this.ctx.arc(x - size * 0.5, y - size * 0.15 + walkOffset, size * 0.15, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            case 'fox':
                // Лиса
                this.ctx.fillStyle = '#ff8a4a';
                this.ctx.beginPath();
                this.ctx.ellipse(x, y + walkOffset, size * 0.5, size * 0.35, 0, 0, Math.PI * 2);
                this.ctx.fill();
                // Голова
                this.ctx.beginPath();
                this.ctx.arc(x - size * 0.35, y + walkOffset, size * 0.25, 0, Math.PI * 2);
                this.ctx.fill();
                // Хвост
                this.ctx.beginPath();
                this.ctx.arc(x + size * 0.4, y + walkOffset, size * 0.3, 0, Math.PI * 2);
                this.ctx.fill();
                break;
        }
        
        // Отрисовка здоровья, если хищник находится под атакой
        if (window.agents && window.agents.agents) {
            // Ищем агента, который атакует этого хищника (сравниваем по ID или по ссылке на объект)
            const attackingAgent = window.agents.agents.find(agent => {
                if (!agent.attackTarget || agent.attackTarget.type !== 'predator') return false;
                const targetPredator = agent.attackTarget.obj;
                // Сравниваем по ID (если есть) или по ссылке на объект
                return (predator.id && targetPredator.id && predator.id === targetPredator.id) || 
                       targetPredator === predator;
            });
            
            if (attackingAgent) {
                const health = Math.max(0, predator.health || 100);
                const maxHealth = 100;
                const healthPercent = Math.max(0, Math.min(100, (health / maxHealth) * 100));
                
                // Фон полоски здоровья
                const barWidth = 40;
                const barHeight = 6;
                const barX = x - barWidth / 2;
                const barY = y - size - 15;
                
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                this.ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
                
                // Полоска здоровья
                const healthWidth = (barWidth * healthPercent) / 100;
                this.ctx.fillStyle = healthPercent > 50 ? '#4CAF50' : healthPercent > 25 ? '#FF9800' : '#F44336';
                this.ctx.fillRect(barX, barY, healthWidth, barHeight);
                
                // Текст здоровья
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(Math.ceil(health) + '/' + maxHealth, x, barY - 3);
            }
        }
    }

    drawAnimal(animal) {
        if (!this.ctx) return;
        
        const x = animal.x;
        const y = animal.y;
        const size = animal.size;
        const time = Date.now() / 1000;
        
        // Анимация движения (покачивание)
        const walkOffset = Math.sin(time * 2 + animal.x * 0.1) * 1.5;
        const headBob = Math.sin(time * 3 + animal.x * 0.1) * 0.5;
        
        // Тень животного
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.beginPath();
        this.ctx.ellipse(x + 1, y + size + 1, size * 0.6, size * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Отрисовка в зависимости от типа животного
        switch(animal.type) {
            case 'cow':
            case 'bull':
                // Корова/Бык
                this.ctx.fillStyle = animal.type === 'bull' ? '#4a2a1a' : '#8a6a4a';
                this.ctx.beginPath();
                this.ctx.ellipse(x, y + walkOffset, size * 0.6, size * 0.4, 0, 0, Math.PI * 2);
                this.ctx.fill();
                // Голова
                this.ctx.beginPath();
                this.ctx.ellipse(x - size * 0.4, y + headBob, size * 0.3, size * 0.25, 0, 0, Math.PI * 2);
                this.ctx.fill();
                // Рога (для быка)
                if (animal.type === 'bull') {
                    this.ctx.strokeStyle = '#2a1a0a';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x - size * 0.5, y - size * 0.2);
                    this.ctx.lineTo(x - size * 0.6, y - size * 0.4);
                    this.ctx.stroke();
                }
                break;
            case 'goat':
                // Коза
                this.ctx.fillStyle = '#6a5a4a';
                this.ctx.beginPath();
                this.ctx.ellipse(x, y + walkOffset, size * 0.5, size * 0.35, 0, 0, Math.PI * 2);
                this.ctx.fill();
                // Голова
                this.ctx.beginPath();
                this.ctx.ellipse(x - size * 0.35, y + headBob, size * 0.25, size * 0.2, 0, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            case 'sheep':
                // Овца
                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.ctx.ellipse(x, y + walkOffset, size * 0.55, size * 0.4, 0, 0, Math.PI * 2);
                this.ctx.fill();
                // Голова
                this.ctx.fillStyle = '#f0f0f0';
                this.ctx.beginPath();
                this.ctx.ellipse(x - size * 0.4, y + headBob, size * 0.25, size * 0.2, 0, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            case 'rooster':
            case 'chicken':
                // Петух/Курица
                this.ctx.fillStyle = animal.type === 'rooster' ? '#ff6600' : '#ffaa00';
                this.ctx.beginPath();
                this.ctx.arc(x, y + walkOffset, size * 0.4, 0, Math.PI * 2);
                this.ctx.fill();
                // Голова
                this.ctx.fillStyle = '#ff8800';
                this.ctx.beginPath();
                this.ctx.arc(x - size * 0.3, y + headBob, size * 0.25, 0, Math.PI * 2);
                this.ctx.fill();
                // Гребешок (для петуха)
                if (animal.type === 'rooster') {
                    this.ctx.fillStyle = '#ff0000';
                    this.ctx.beginPath();
                    this.ctx.moveTo(x - size * 0.35, y - size * 0.2 + headBob);
                    this.ctx.lineTo(x - size * 0.25, y - size * 0.35 + headBob);
                    this.ctx.lineTo(x - size * 0.15, y - size * 0.2 + headBob);
                    this.ctx.closePath();
                    this.ctx.fill();
                }
                break;
            case 'cat':
                // Кошка
                this.ctx.fillStyle = '#8a6a4a';
                this.ctx.beginPath();
                this.ctx.ellipse(x, y + walkOffset, size * 0.4, size * 0.3, 0, 0, Math.PI * 2);
                this.ctx.fill();
                // Голова
                this.ctx.beginPath();
                this.ctx.arc(x - size * 0.3, y + headBob, size * 0.25, 0, Math.PI * 2);
                this.ctx.fill();
                // Уши
                this.ctx.beginPath();
                this.ctx.moveTo(x - size * 0.4, y - size * 0.15 + headBob);
                this.ctx.lineTo(x - size * 0.35, y - size * 0.3 + headBob);
                this.ctx.lineTo(x - size * 0.3, y - size * 0.15 + headBob);
                this.ctx.closePath();
                this.ctx.fill();
                break;
        }
        
        // Отрисовка здоровья, если животное находится под атакой
        if (window.agents && window.agents.agents) {
            // Ищем агента, который атакует это животное (сравниваем по ID или по ссылке на объект)
            const attackingAgent = window.agents.agents.find(agent => {
                if (!agent.attackTarget || agent.attackTarget.type !== 'animal') return false;
                const targetAnimal = agent.attackTarget.obj;
                // Сравниваем по ID (если есть) или по ссылке на объект
                return (animal.id && targetAnimal.id && animal.id === targetAnimal.id) || 
                       targetAnimal === animal;
            });
            
            if (attackingAgent) {
                const health = Math.max(0, animal.health || 100);
                const maxHealth = 100;
                const healthPercent = Math.max(0, Math.min(100, (health / maxHealth) * 100));
                
                // Фон полоски здоровья
                const barWidth = 40;
                const barHeight = 6;
                const barX = x - barWidth / 2;
                const barY = y - size - 15;
                
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                this.ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
                
                // Полоска здоровья
                const healthWidth = (barWidth * healthPercent) / 100;
                this.ctx.fillStyle = healthPercent > 50 ? '#4CAF50' : healthPercent > 25 ? '#FF9800' : '#F44336';
                this.ctx.fillRect(barX, barY, healthWidth, barHeight);
                
                // Текст здоровья
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(Math.ceil(health) + '/' + maxHealth, x, barY - 3);
            }
        }
    }

    drawResource(resource) {
        if (!this.ctx) return;
        
        const x = resource.x;
        const y = resource.y;
        const type = resource.type;
        
        // Инструменты и оружие
        if (['saw', 'axe', 'hammer', 'pickaxe', 'shovel', 'fishing_rod', 'gun', 'bow'].includes(type)) {
            this.ctx.fillStyle = '#5a5a5a';
            this.ctx.strokeStyle = '#3a3a3a';
            this.ctx.lineWidth = 1;
            
            if (type === 'saw') {
                // Пила - зубчатая линия
                this.ctx.beginPath();
                this.ctx.moveTo(x - 8, y);
                for (let i = 0; i < 5; i++) {
                    this.ctx.lineTo(x - 8 + i * 3, y - 2);
                    this.ctx.lineTo(x - 8 + i * 3 + 1.5, y + 2);
                }
                this.ctx.lineTo(x + 8, y);
                this.ctx.stroke();
            } else if (type === 'axe') {
                // Топор
                this.ctx.fillRect(x - 3, y - 8, 6, 12);
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - 8);
                this.ctx.lineTo(x + 6, y - 12);
                this.ctx.lineTo(x + 8, y - 10);
                this.ctx.lineTo(x + 2, y - 6);
                this.ctx.closePath();
                this.ctx.fill();
            } else if (type === 'hammer') {
                // Молоток
                this.ctx.fillRect(x - 2, y - 6, 4, 8);
                this.ctx.fillRect(x - 4, y - 8, 8, 3);
            } else if (type === 'pickaxe') {
                // Кирка
                this.ctx.fillRect(x - 2, y - 8, 4, 12);
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - 8);
                this.ctx.lineTo(x - 4, y - 12);
                this.ctx.lineTo(x - 2, y - 10);
                this.ctx.closePath();
                this.ctx.fill();
            } else if (type === 'shovel') {
                // Лопата
                this.ctx.fillRect(x - 1, y - 8, 2, 10);
                this.ctx.fillRect(x - 4, y - 12, 8, 4);
            } else if (type === 'fishing_rod') {
                // Удочка - тонкая линия с леской
                this.ctx.strokeStyle = '#8b4513';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x - 10, y - 15);
                this.ctx.stroke();
                this.ctx.strokeStyle = '#cccccc';
                this.ctx.beginPath();
                this.ctx.moveTo(x - 10, y - 15);
                this.ctx.lineTo(x - 12, y - 20);
                this.ctx.stroke();
            } else if (type === 'gun') {
                // Ружье - длинный прямоугольник с прикладом
                this.ctx.fillStyle = '#3a3a3a';
                this.ctx.fillRect(x - 8, y - 2, 16, 4);
                // Приклад
                this.ctx.fillRect(x - 10, y - 1, 3, 6);
                // Ствол
                this.ctx.fillRect(x + 8, y - 1, 4, 2);
            } else if (type === 'bow') {
                // Лук - изогнутая дуга
                this.ctx.strokeStyle = '#8b4513';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(x - 8, y);
                this.ctx.quadraticCurveTo(x, y - 8, x + 8, y);
                this.ctx.stroke();
                // Тетива
                this.ctx.strokeStyle = '#cccccc';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(x - 8, y);
                this.ctx.lineTo(x + 8, y);
                this.ctx.stroke();
            }
        }
        // Боеприпасы
        else if (type === 'ammo' || type === 'bullets') {
            // Патроны - маленькие коричневые цилиндры
            this.ctx.fillStyle = '#8b4513';
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, 2, 3, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#ffd700';
            this.ctx.beginPath();
            this.ctx.ellipse(x, y - 2, 2, 1, 0, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'arrows') {
            // Стрелы - тонкая линия с наконечником
            this.ctx.strokeStyle = '#8b4513';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + 8, y - 6);
            this.ctx.stroke();
            // Наконечник
            this.ctx.fillStyle = '#5a5a5a';
            this.ctx.beginPath();
            this.ctx.moveTo(x + 8, y - 6);
            this.ctx.lineTo(x + 10, y - 5);
            this.ctx.lineTo(x + 8, y - 4);
            this.ctx.closePath();
            this.ctx.fill();
            // Оперение
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.moveTo(x + 2, y - 1);
            this.ctx.lineTo(x + 3, y - 2);
            this.ctx.moveTo(x + 2, y + 1);
            this.ctx.lineTo(x + 3, y + 2);
            this.ctx.stroke();
        }
        // Еда
        else if (type === 'cooked_food') {
            this.ctx.fillStyle = '#ffaa44';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 5, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'meat') {
            this.ctx.fillStyle = '#cc4444';
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, 4, 3, 0, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'bird') {
            this.ctx.fillStyle = '#8a6a4a';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'fish') {
            this.ctx.fillStyle = '#4a7a9a';
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, 6, 3, 0, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'honey') {
            // Мёд - золотистый цвет
            this.ctx.fillStyle = '#ffaa00';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'milk') {
            // Молоко - белый цвет
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'water') {
            // Вода - синий цвет
            this.ctx.fillStyle = '#4a9aff';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'bread') {
            // Хлеб - коричневый цвет
            this.ctx.fillStyle = '#d4a574';
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, 5, 3, 0, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'kebab') {
            // Шашлык - темно-красный
            this.ctx.fillStyle = '#8b0000';
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, 5, 4, 0, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'potato') {
            // Картофель - коричневый
            this.ctx.fillStyle = '#8b6914';
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, 4, 3, 0, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'salad') {
            // Салат - зеленый
            this.ctx.fillStyle = '#7cb342';
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, 5, 4, 0, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'mushrooms') {
            // Грибы - коричневый с белой шляпкой
            this.ctx.fillStyle = '#8b4513';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(x, y - 2, 4, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'tea') {
            // Чай - коричневый
            this.ctx.fillStyle = '#8b4513';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'banana') {
            // Банан - желтый
            this.ctx.fillStyle = '#ffeb3b';
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, 5, 3, -0.5, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'orange') {
            // Апельсин - оранжевый
            this.ctx.fillStyle = '#ff9800';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'apple') {
            // Яблоко - красный
            this.ctx.fillStyle = '#f44336';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'lemon') {
            // Лимон - желтый
            this.ctx.fillStyle = '#ffeb3b';
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, 4, 3, 0, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'rosehip') {
            // Шиповник - красный
            this.ctx.fillStyle = '#d32f2f';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'cabbage') {
            // Капуста - зеленый
            this.ctx.fillStyle = '#4caf50';
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, 5, 4, 0, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'spices') {
            // Специи - коричневый порошок
            this.ctx.fillStyle = '#8b4513';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'first_aid_kit') {
            // Аптечка - красный крест на белом фоне
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(x - 6, y - 6, 12, 12);
            this.ctx.strokeStyle = '#cccccc';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x - 6, y - 6, 12, 12);
            // Красный крест
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(x - 1, y - 4, 2, 8);
            this.ctx.fillRect(x - 4, y - 1, 8, 2);
        } else if (type === 'mint') {
            // Мята - зеленый
            this.ctx.fillStyle = '#66bb6a';
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, 4, 3, 0, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'st_johns_wort') {
            // Зверобой - желтый
            this.ctx.fillStyle = '#ffc107';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
        // Деньги
        else if (type === 'money') {
            this.ctx.fillStyle = '#ffd700';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#ffaa00';
            this.ctx.font = '8px Arial';
            this.ctx.fillText('$', x - 3, y + 3);
        }
        // Одежда (просто иконка)
        else if (type.includes('clothes')) {
            this.ctx.fillStyle = type.includes('winter') ? '#4a6a9a' : '#9a6a4a';
            this.ctx.fillRect(x - 5, y - 3, 10, 6);
        }
    }

    // Отрисовка предпросмотра пути
    drawPathPreview() {
        if (!this.ctx || !window.simulation) return;
        
        const sim = window.simulation;
        const ctx = this.ctx;
        
        ctx.save();
        ctx.strokeStyle = '#4a9eff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.globalAlpha = 0.7;
        
        
        ctx.restore();
    }
    
    // Отрисовка прямого пути агента
    drawDirectPath(agent) {
        if (!this.ctx || !agent.pathType || agent.pathType !== 'direct' || !agent.targetPosition || !agent.position) return;
        
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.globalAlpha = 0.5;
        
        ctx.beginPath();
        ctx.moveTo(agent.position.x, agent.position.y);
        ctx.lineTo(agent.targetPosition.x, agent.targetPosition.y);
        ctx.stroke();
        
        // Рисуем точку цели
        ctx.fillStyle = '#4caf50';
        ctx.beginPath();
        ctx.arc(agent.targetPosition.x, agent.targetPosition.y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    drawFire(fire) {
        if (!this.ctx) return;
        
        const x = fire.x;
        const y = fire.y;
        const time = (Date.now() - fire.time) / 1000; // Время в секундах для анимации
        
        // Анимация интенсивности (пульсация)
        const pulse = Math.sin(time * 2) * 0.1 + 0.9;
        
        // Тень костра
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.beginPath();
        this.ctx.ellipse(x + 2, y + 2, 12 * pulse, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Внешнее пламя (оранжевое)
        const outerGradient = this.ctx.createRadialGradient(x, y, 0, x, y, 15 * pulse);
        outerGradient.addColorStop(0, 'rgba(255, 200, 0, 0.8)');
        outerGradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.6)');
        outerGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
        this.ctx.fillStyle = outerGradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 15 * pulse, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Среднее пламя (красное)
        const middleGradient = this.ctx.createRadialGradient(x, y, 0, x, y, 10 * pulse);
        middleGradient.addColorStop(0, 'rgba(255, 150, 0, 1)');
        middleGradient.addColorStop(0.7, 'rgba(255, 50, 0, 0.7)');
        middleGradient.addColorStop(1, 'rgba(200, 0, 0, 0)');
        this.ctx.fillStyle = middleGradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 10 * pulse, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Внутреннее пламя (желтое/белое)
        const innerGradient = this.ctx.createRadialGradient(x, y - 2, 0, x, y, 6 * pulse);
        innerGradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
        innerGradient.addColorStop(0.5, 'rgba(255, 200, 100, 0.8)');
        innerGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
        this.ctx.fillStyle = innerGradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y - 2, 6 * pulse, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Угли (темные внизу)
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + 3, 4, 2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Тлеющие угли (красные точки)
        this.ctx.fillStyle = '#ff4444';
        for (let i = 0; i < 3; i++) {
            const angle = (time * 0.5 + i * 2) % (Math.PI * 2);
            const coalX = x + Math.cos(angle) * 3;
            const coalY = y + 3 + Math.sin(angle) * 1;
            this.ctx.beginPath();
            this.ctx.arc(coalX, coalY, 1, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Искры (летящие вверх)
        this.ctx.fillStyle = 'rgba(255, 200, 100, 0.8)';
        for (let i = 0; i < 5; i++) {
            const sparkX = x + (Math.sin(time * 3 + i) * 8);
            const sparkY = y - 5 - (time * 10 + i * 2) % 15;
            if (sparkY > y - 20) {
                this.ctx.beginPath();
                this.ctx.arc(sparkX, sparkY, 1, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    // Рисование агента другого игрока (с другим цветом)
    drawOtherPlayerAgent(agent) {
        if (!this.ctx || !agent || agent.health <= 0) return;
        
        const x = agent.position ? agent.position.x : (agent.x || 100);
        const y = agent.position ? agent.position.y : (agent.y || 100);
        
        // Преобразуем мировые координаты в экранные
        const screenX = (x - this.camera.x) * this.camera.scale;
        const screenY = (y - this.camera.y) * this.camera.scale;
        
        // Проверяем, виден ли агент на экране
        if (screenX < -50 || screenX > this.canvas.width + 50 ||
            screenY < -50 || screenY > this.canvas.height + 50) {
            return;
        }
        
        this.ctx.save();
        this.ctx.translate(screenX, screenY);
        
        // Тело (синий оттенок для других игроков)
        this.ctx.fillStyle = '#4a9eff';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 12, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Голова
        this.ctx.fillStyle = '#ffdbac';
        this.ctx.beginPath();
        this.ctx.arc(0, -15, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Имя игрока над агентом
        this.ctx.fillStyle = '#4a9eff';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(agent.name || 'Игрок', 0, -30);
        
        this.ctx.restore();
    }
    
    // ========== ОТРИСОВКА ЗДАНИЙ ==========
    
    drawBuildings() {
        if (!this.buildings || this.buildings.length === 0) return;
        
        for (const building of this.buildings) {
            switch (building.type) {
                case 'house':
                    this.drawHouse(building);
                    break;
                case 'pen':
                    this.drawPen(building);
                    break;
                case 'barn':
                    this.drawBarn(building);
                    break;
                default:
                    // Неизвестный тип здания - рисуем как простой прямоугольник
                    this.ctx.fillStyle = '#8B4513';
                    this.ctx.fillRect(building.x - 20, building.y - 20, 40, 40);
            }
        }
    }
    
    drawHouse(building) {
        const x = building.x;
        const y = building.y;
        const size = 50; // Размер дома
        
        this.ctx.save();
        
        // Улучшенная программная отрисовка дома без белого фона
        
        // Тень дома
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(x + 3, y + size/2 + 2, size * 0.6, size * 0.2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Основание дома (коричневые бревна с текстурой)
        const wallHeight = size * 0.6;
        const wallY = y - size/3;
        
        // Градиент для стены
        const wallGradient = this.ctx.createLinearGradient(x - size/2, wallY, x - size/2, wallY + wallHeight);
        wallGradient.addColorStop(0, '#A0522D'); // Светлее сверху
        wallGradient.addColorStop(1, '#6B4423'); // Темнее снизу
        this.ctx.fillStyle = wallGradient;
        this.ctx.fillRect(x - size/2, wallY, size, wallHeight);
        
        // Горизонтальные линии бревен с объемом
        this.ctx.strokeStyle = '#5D3A1A';
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const lineY = wallY + i * (wallHeight / 4);
            // Верхняя тень линии
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.beginPath();
            this.ctx.moveTo(x - size/2, lineY + 1);
            this.ctx.lineTo(x + size/2, lineY + 1);
            this.ctx.stroke();
            // Основная линия
            this.ctx.strokeStyle = '#5D3A1A';
            this.ctx.beginPath();
            this.ctx.moveTo(x - size/2, lineY);
            this.ctx.lineTo(x + size/2, lineY);
            this.ctx.stroke();
            // Нижний блик
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.beginPath();
            this.ctx.moveTo(x - size/2, lineY - 1);
            this.ctx.lineTo(x + size/2, lineY - 1);
            this.ctx.stroke();
        }
        
        // Вертикальные линии для объема бревен
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.lineWidth = 1;
        for (let i = 1; i < 3; i++) {
            const lineX = x - size/2 + i * (size / 3);
            this.ctx.beginPath();
            this.ctx.moveTo(lineX, wallY);
            this.ctx.lineTo(lineX, wallY + wallHeight);
            this.ctx.stroke();
        }
        
        // Крыша (треугольник с черепицей)
        const roofGradient = this.ctx.createLinearGradient(x, y - size/2 - 10, x, y - size/3);
        roofGradient.addColorStop(0, '#8B4513'); // Светлее сверху
        roofGradient.addColorStop(1, '#5D3A1A'); // Темнее снизу
        this.ctx.fillStyle = roofGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(x - size/2 - 5, y - size/3);
        this.ctx.lineTo(x, y - size/2 - 10);
        this.ctx.lineTo(x + size/2 + 5, y - size/3);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Контур крыши
        this.ctx.strokeStyle = '#3D2817';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Черепица (горизонтальные линии)
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const roofY = y - size/3 - i * 3;
            const roofWidth = (size/2 + 5) * (1 - i * 0.3);
            this.ctx.beginPath();
            this.ctx.moveTo(x - roofWidth, roofY);
            this.ctx.lineTo(x + roofWidth, roofY);
            this.ctx.stroke();
        }
        
        // Дверь с деталями
        const doorWidth = 16;
        const doorHeight = size * 0.25;
        const doorGradient = this.ctx.createLinearGradient(x - doorWidth/2, y, x - doorWidth/2, y + doorHeight);
        doorGradient.addColorStop(0, '#5D3A1A');
        doorGradient.addColorStop(1, '#3D2817');
        this.ctx.fillStyle = doorGradient;
        this.ctx.fillRect(x - doorWidth/2, y, doorWidth, doorHeight);
        
        // Ручка двери
        this.ctx.fillStyle = '#C0C0C0';
        this.ctx.beginPath();
        this.ctx.arc(x + doorWidth/2 - 3, y + doorHeight/2, 1.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Окно с рамой
        const windowX = x + 12;
        const windowY = y - size/6;
        const windowSize = 10;
        
        // Стекло окна (светлее)
        this.ctx.fillStyle = '#B0E0E6';
        this.ctx.fillRect(windowX, windowY, windowSize, windowSize);
        
        // Рама окна
        this.ctx.strokeStyle = '#5D3A1A';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(windowX, windowY, windowSize, windowSize);
        
        // Перекрестие окна
        this.ctx.strokeStyle = '#5D3A1A';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(windowX + windowSize/2, windowY);
        this.ctx.lineTo(windowX + windowSize/2, windowY + windowSize);
        this.ctx.moveTo(windowX, windowY + windowSize/2);
        this.ctx.lineTo(windowX + windowSize, windowY + windowSize/2);
        this.ctx.stroke();
        
        // Блики на стекле
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.fillRect(windowX + 1, windowY + 1, 3, 3);
        
        this.ctx.restore();
    }
    
    drawPen(building) {
        const x = building.x;
        const y = building.y;
        const size = 60;
        
        this.ctx.save();
        
        // Забор загона
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x - size/2, y - size/2, size, size);
        
        // Вертикальные столбики забора
        this.ctx.fillStyle = '#654321';
        for (let i = 0; i <= 4; i++) {
            const postX = x - size/2 + i * (size/4);
            this.ctx.fillRect(postX - 2, y - size/2 - 5, 4, size + 10);
        }
        
        // Горизонтальные перекладины
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(x - size/2, y - size/3, size, 3);
        this.ctx.fillRect(x - size/2, y + size/6, size, 3);
        
        // Земля внутри загона
        this.ctx.fillStyle = 'rgba(139, 90, 43, 0.3)';
        this.ctx.fillRect(x - size/2 + 3, y - size/2 + 3, size - 6, size - 6);
        
        this.ctx.restore();
    }
    
    drawBarn(building) {
        const x = building.x;
        const y = building.y;
        const width = 70;
        const height = 50;
        
        this.ctx.save();
        
        // Основание сарая
        this.ctx.fillStyle = '#A0522D';
        this.ctx.fillRect(x - width/2, y - height/3, width, height * 0.7);
        
        // Горизонтальные доски
        this.ctx.strokeStyle = '#6B3A1A';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const lineY = y - height/3 + i * (height * 0.14);
            this.ctx.beginPath();
            this.ctx.moveTo(x - width/2, lineY);
            this.ctx.lineTo(x + width/2, lineY);
            this.ctx.stroke();
        }
        
        // Крыша сарая (трапеция)
        this.ctx.fillStyle = '#8B0000';
        this.ctx.beginPath();
        this.ctx.moveTo(x - width/2 - 5, y - height/3);
        this.ctx.lineTo(x - width/4, y - height/2 - 5);
        this.ctx.lineTo(x + width/4, y - height/2 - 5);
        this.ctx.lineTo(x + width/2 + 5, y - height/3);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Большие ворота
        this.ctx.fillStyle = '#5D3A1A';
        this.ctx.fillRect(x - 15, y - height/6, 30, height * 0.5);
        
        // Линия разделения ворот
        this.ctx.strokeStyle = '#3D2817';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - height/6);
        this.ctx.lineTo(x, y + height * 0.3);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawAgent(agent) {
        if (!this.ctx || !agent) return;
        
        // Проверяем наличие позиции
        if (!agent.position) {
            console.warn('Агент без позиции:', agent.name, agent);
            return;
        }

        const x = agent.position.x;
        const y = agent.position.y;
        
        // Проверяем валидность координат
        if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
            console.warn('Некорректные координаты агента:', agent.name, x, y);
            return;
        }
        const state = agent.state || 'explore';
        const health = agent.health !== undefined ? agent.health : 100;
        const time = Date.now() / 1000;
        
        // Отрисовка полосы направления движения (если включено в настройках)
        if (window.showAgentDirection && agent.health > 0 && state !== 'sleep' && state !== 'dead') {
            // Вычисляем направление движения
            let directionX = 0;
            let directionY = 0;
            
            // Если есть целевая позиция - направление к ней
            if (agent.targetPosition) {
                directionX = agent.targetPosition.x - x;
                directionY = agent.targetPosition.y - y;
            } else if (agent.lastDirection) {
                // Используем последнее направление движения
                directionX = agent.lastDirection.x || 0;
                directionY = agent.lastDirection.y || 0;
            } else if (agent.velocity) {
                // Используем скорость как направление
                directionX = agent.velocity.x || 0;
                directionY = agent.velocity.y || 0;
            }
            
            // Нормализуем и рисуем полосу направления
            const length = Math.sqrt(directionX * directionX + directionY * directionY);
            if (length > 0.1) {
                const normalizedX = directionX / length;
                const normalizedY = directionY / length;
                const lineLength = 40; // Длина полосы направления
                
                // Рисуем полупрозрачную полосу направления
                const gradient = this.ctx.createLinearGradient(
                    x, y,
                    x + normalizedX * lineLength,
                    y + normalizedY * lineLength
                );
                gradient.addColorStop(0, 'rgba(74, 158, 255, 0.6)');
                gradient.addColorStop(1, 'rgba(74, 158, 255, 0)');
                
                this.ctx.strokeStyle = gradient;
                this.ctx.lineWidth = 4;
                this.ctx.lineCap = 'round';
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x + normalizedX * lineLength, y + normalizedY * lineLength);
                this.ctx.stroke();
                
                // Рисуем стрелку на конце
                const arrowSize = 6;
                const arrowX = x + normalizedX * lineLength;
                const arrowY = y + normalizedY * lineLength;
                const angle = Math.atan2(normalizedY, normalizedX);
                
                this.ctx.fillStyle = 'rgba(74, 158, 255, 0.4)';
                this.ctx.beginPath();
                this.ctx.moveTo(arrowX, arrowY);
                this.ctx.lineTo(
                    arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
                    arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
                );
                this.ctx.lineTo(
                    arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
                    arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
                );
                this.ctx.closePath();
                this.ctx.fill();
            }
        }
        
        // Проверяем, выбран ли этот агент (сравниваем по ID для надежности)
        const isSelected = window.simulation && (
            window.simulation.selectedAgent === agent || 
            (window.simulation.selectedAgent && window.simulation.selectedAgent.id === agent.id)
        );
        
        // Визуальное выделение выбранного агента
        if (isSelected) {
            // Рисуем круговое выделение вокруг агента
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(x, y - 5, 20, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Рисуем второй круг для эффекта пульсации
            const pulse = Math.sin(time * 3) * 0.3 + 0.7;
            this.ctx.strokeStyle = `rgba(0, 255, 0, ${pulse * 0.5})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(x, y - 5, 25, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        // Если есть целевая позиция, рисуем линию к ней
        if (agent.targetPosition && agent.isPlayerControlled) {
            this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(agent.targetPosition.x, agent.targetPosition.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            // Рисуем маркер цели
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(agent.targetPosition.x, agent.targetPosition.y, 5, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Визуализация поиска ресурсов
        if (agent.searchResourceType && agent.searchRadius > 50 && !agent.targetSupplyResource) {
            // Агент ищет ресурсы - рисуем круг с радиусом поиска
            this.ctx.strokeStyle = 'rgba(255, 200, 0, 0.4)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([3, 3]);
            this.ctx.beginPath();
            this.ctx.arc(x, y, agent.searchRadius, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            // Рисуем стрелку в направлении поиска
            if (agent.searchDirection) {
                const arrowLength = Math.min(agent.searchRadius, 80);
                const arrowEndX = x + agent.searchDirection.x * arrowLength;
                const arrowEndY = y + agent.searchDirection.y * arrowLength;
                
                // Линия стрелки
                this.ctx.strokeStyle = 'rgba(255, 200, 0, 0.6)';
                this.ctx.lineWidth = 3;
                this.ctx.lineCap = 'round';
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(arrowEndX, arrowEndY);
                this.ctx.stroke();
                
                // Наконечник стрелки
                const arrowSize = 8;
                const angle = Math.atan2(agent.searchDirection.y, agent.searchDirection.x);
                this.ctx.fillStyle = 'rgba(255, 200, 0, 0.8)';
                this.ctx.beginPath();
                this.ctx.moveTo(arrowEndX, arrowEndY);
                this.ctx.lineTo(
                    arrowEndX - arrowSize * Math.cos(angle - Math.PI / 6),
                    arrowEndY - arrowSize * Math.sin(angle - Math.PI / 6)
                );
                this.ctx.lineTo(
                    arrowEndX - arrowSize * Math.cos(angle + Math.PI / 6),
                    arrowEndY - arrowSize * Math.sin(angle + Math.PI / 6)
                );
                this.ctx.closePath();
                this.ctx.fill();
            } else if (agent.targetPosition) {
                // Если нет направления поиска, но есть целевая позиция - используем её
                const dx = agent.targetPosition.x - x;
                const dy = agent.targetPosition.y - y;
                const length = Math.sqrt(dx * dx + dy * dy);
                if (length > 0) {
                    const dirX = dx / length;
                    const dirY = dy / length;
                    const arrowLength = Math.min(agent.searchRadius, 80);
                    const arrowEndX = x + dirX * arrowLength;
                    const arrowEndY = y + dirY * arrowLength;
                    
                    // Линия стрелки
                    this.ctx.strokeStyle = 'rgba(255, 200, 0, 0.6)';
                    this.ctx.lineWidth = 3;
                    this.ctx.lineCap = 'round';
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y);
                    this.ctx.lineTo(arrowEndX, arrowEndY);
                    this.ctx.stroke();
                    
                    // Наконечник стрелки
                    const arrowSize = 8;
                    const angle = Math.atan2(dirY, dirX);
                    this.ctx.fillStyle = 'rgba(255, 200, 0, 0.8)';
                    this.ctx.beginPath();
                    this.ctx.moveTo(arrowEndX, arrowEndY);
                    this.ctx.lineTo(
                        arrowEndX - arrowSize * Math.cos(angle - Math.PI / 6),
                        arrowEndY - arrowSize * Math.sin(angle - Math.PI / 6)
                    );
                    this.ctx.lineTo(
                        arrowEndX - arrowSize * Math.cos(angle + Math.PI / 6),
                        arrowEndY - arrowSize * Math.sin(angle + Math.PI / 6)
                    );
                    this.ctx.closePath();
                    this.ctx.fill();
                }
            }
        }
        
        // Визуализация движения к ресурсу
        if (agent.targetSupplyResource && agent.targetSupplyResource.resource) {
            const resource = agent.targetSupplyResource.resource;
            
            // Проверяем, что ресурс все еще существует в мире
            let resourceExists = false;
            if (resource.isTree && this.terrain && this.terrain.forest) {
                // Для деревьев проверяем в массиве деревьев
                resourceExists = this.terrain.forest.includes(resource);
            } else if (this.resources) {
                // Для обычных ресурсов проверяем в массиве ресурсов
                resourceExists = this.resources.includes(resource);
            }
            
            // Проверяем расстояние до ресурса
            const dx = resource.x - x;
            const dy = resource.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Рисуем линию только если:
            // 1. Ресурс существует в мире
            // 2. Агент еще не достиг ресурса (расстояние > 10 пикселей)
            // 3. Агент в состоянии сбора ресурсов или движется к ресурсу
            if (resourceExists && distance > 10 && (agent.state === 'gatherSupplies' || agent.targetPosition)) {
                // Рисуем линию к ресурсу
                this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([4, 4]);
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(resource.x, resource.y);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
                
                // Рисуем маркер на ресурсе
                this.ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
                this.ctx.beginPath();
                this.ctx.arc(resource.x, resource.y, 6, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Обводка маркера
                this.ctx.strokeStyle = 'rgba(0, 255, 0, 1)';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            } else if (!resourceExists || distance <= 10) {
                // Ресурс собран или агент достиг его - очищаем targetSupplyResource
                agent.targetSupplyResource = null;
                agent.searchDirection = null;
            }
        }
        
        // Определение типа агента и соответствующих цветов одежды
        const agentStyles = {
            'man': { skin: '#f4c2a1', hair: '#3a2a1a', clothes: '#4a6a9a', pants: '#2a4a6a' },
            'woman': { skin: '#f4c2a1', hair: '#8b6a4a', clothes: '#9a4a6a', pants: '#6a2a4a' },
            'boy': { skin: '#f8d4b4', hair: '#2a1a0a', clothes: '#5a8a5a', pants: '#3a6a3a' },
            'girl': { skin: '#f8d4b4', hair: '#ffcc99', clothes: '#ff8a9a', pants: '#cc6a7a' },
            'oldman': { skin: '#d4a282', hair: '#6a5a4a', clothes: '#5a5a5a', pants: '#3a3a3a' },
            'oldwoman': { skin: '#d4a282', hair: '#8a7a6a', clothes: '#7a5a7a', pants: '#5a3a5a' }
        };
        
        const style = agentStyles[agent.type] || agentStyles['man'];
        
        // Проверяем, мертв ли агент
        const isDead = agent.health <= 0;
        
        // Анимация движения (покачивание при ходьбе) - только для живых и активных
        const isSleeping = state === 'sleep';
        const walkOffset = (isDead || state === 'rest' || isSleeping) ? 0 : Math.sin(time * 4 + x * 0.1) * 1.5;
        const headBob = (isDead || state === 'rest' || isSleeping) ? 0 : Math.sin(time * 4 + x * 0.1) * 0.5;
        
        // Тень человека
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(x + 2, y + 18, 6, 3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Если агент мертв - рисуем его лежащим
        if (isDead) {
            // Определяем, является ли агент женщиной
            const isWomanDead = agent.gender === 'female' || ['woman', 'girl', 'oldwoman'].includes(agent.type);
            
            // Сохраняем контекст для поворота
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(Math.PI / 2); // Поворачиваем на 90 градусов
            
            // Тело (туловище) - лежащее
            this.ctx.fillStyle = style.clothes;
            this.ctx.fillRect(-4, -5, 8, 10);
            
            // Голова - лежащая
            this.ctx.fillStyle = style.skin;
            this.ctx.beginPath();
            this.ctx.arc(0, -8, 5, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Волосы
            this.ctx.fillStyle = style.hair;
            this.ctx.beginPath();
            this.ctx.arc(0, -9, 5, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Руки - вытянуты вдоль тела
            this.ctx.fillStyle = style.skin;
            this.ctx.fillRect(-6, -3, 2, 6);
            this.ctx.fillRect(4, -3, 2, 6);
            
            if (isWomanDead) {
                // Для женщин - платье (расширяется книзу)
                this.ctx.fillStyle = style.clothes;
                this.ctx.beginPath();
                this.ctx.moveTo(-4, 5); // Верх платья
                this.ctx.lineTo(-6, 12); // Левая нижняя точка
                this.ctx.lineTo(6, 12); // Правая нижняя точка
                this.ctx.lineTo(4, 5); // Верх платья
                this.ctx.closePath();
                this.ctx.fill();
                
                // Ноги под платьем (видны только нижняя часть)
                this.ctx.fillStyle = style.skin;
                this.ctx.fillRect(-3, 10, 2, 4);
                this.ctx.fillRect(1, 10, 2, 4);
            } else {
                // Для мужчин - брюки
                // Ноги - вытянуты
                this.ctx.fillStyle = style.pants;
                this.ctx.fillRect(-3, 5, 3, 8);
                this.ctx.fillRect(0, 5, 3, 8);
            }
            
            // Обувь
            this.ctx.fillStyle = '#2a1a1a';
            this.ctx.fillRect(-4, 12, 2, 2);
            this.ctx.fillRect(2, 12, 2, 2);
            
            // Закрытые глаза (мертвый)
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(-2, -9);
            this.ctx.lineTo(-1, -9);
            this.ctx.moveTo(1, -9);
            this.ctx.lineTo(2, -9);
            this.ctx.stroke();
            
            // Крест на индикаторе здоровья (мертв)
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(7, -12);
            this.ctx.lineTo(9, -10);
            this.ctx.moveTo(9, -12);
            this.ctx.lineTo(7, -10);
            this.ctx.stroke();
            
            this.ctx.restore();
        } else {
            // Живой агент - обычная отрисовка
            // Определение позы в зависимости от состояния (с анимацией)
            let armAngle = 0;
            let legAngle = 0;
            let bodyOffsetX = 0;
            let bodyOffsetY = 0;
            const animFrame = agent.animationFrame || 0;
            
            // Анимация наклонения для сбора ресурсов
            if (agent.isBending) {
                bodyOffsetY = 3; // Наклон туловища вперед
                bodyOffsetX = Math.sin(animFrame * 0.3) * 1; // Легкое покачивание
            }
            
            // Анимация рубки дерева
            if (agent.isChopping) {
                armAngle = Math.sin(animFrame * 0.5) * 1.2; // Движение рук вверх-вниз
                legAngle = 0.1; // Ноги слегка расставлены
            } else if (agent.isRunning || state === 'defend') {
                // Бег - более быстрые движения
                armAngle = 0.8 + Math.sin(time * 8 + x * 0.1) * 0.4;
                legAngle = 0.5 + Math.sin(time * 8 + x * 0.1) * 0.3;
            } else if (state === 'rest') {
                // Сидит или стоит спокойно
                armAngle = 0.2;
                legAngle = 0;
            } else if (state === 'findFood') {
                // Быстро идет
                armAngle = 0.5 + Math.sin(time * 6 + x * 0.1) * 0.2;
                legAngle = 0.3 + Math.sin(time * 6 + x * 0.1) * 0.2;
            } else {
                // Идет нормально
                armAngle = 0.3 + Math.sin(time * 4 + x * 0.1) * 0.15;
                legAngle = 0.2 + Math.sin(time * 4 + x * 0.1) * 0.15;
            }
            
            // Определяем, является ли агент женщиной
            const isWoman = agent.gender === 'female' || ['woman', 'girl', 'oldwoman'].includes(agent.type);
            
            if (isWoman) {
                // Для женщин рисуем платье
                // Платье (расширяется книзу)
                this.ctx.fillStyle = style.clothes;
                this.ctx.beginPath();
                this.ctx.moveTo(x - 4, y - 2); // Верх платья (талия)
                this.ctx.lineTo(x - 5, y + 14); // Левая нижняя точка
                this.ctx.lineTo(x + 5, y + 14); // Правая нижняя точка
                this.ctx.lineTo(x + 4, y - 2); // Верх платья (талия)
                this.ctx.closePath();
                this.ctx.fill();
                
                // Ноги под платьем (видны только нижняя часть)
                this.ctx.fillStyle = style.skin;
                // Левая нога (с анимацией)
                this.ctx.save();
                this.ctx.translate(x - 3, y + 12);
                this.ctx.rotate(state !== 'rest' ? -legAngle + Math.sin(time * 4 + x * 0.1) * 0.2 : 0);
                this.ctx.fillRect(0, 0, 2, 4);
                this.ctx.restore();
                // Правая нога (с анимацией)
                this.ctx.save();
                this.ctx.translate(x, y + 12);
                this.ctx.rotate(state !== 'rest' ? legAngle - Math.sin(time * 4 + x * 0.1) * 0.2 : 0);
                this.ctx.fillRect(0, 0, 2, 4);
                this.ctx.restore();
                
                // Ноги (обувь)
                this.ctx.fillStyle = '#2a1a1a';
                this.ctx.fillRect(x - 4, y + 15 + walkOffset, 2, 2);
                this.ctx.fillRect(x + 2, y + 15 - walkOffset, 2, 2);
            } else {
                // Для мужчин рисуем брюки
                // Ноги (штаны) с анимацией
                this.ctx.fillStyle = style.pants;
                // Левая нога (с анимацией)
                this.ctx.save();
                this.ctx.translate(x - 3, y + 8);
                this.ctx.rotate(state !== 'rest' ? -legAngle + Math.sin(time * 4 + x * 0.1) * 0.2 : 0);
                this.ctx.fillRect(0, 0, 3, 8);
                this.ctx.restore();
                // Правая нога (с анимацией)
                this.ctx.save();
                this.ctx.translate(x, y + 8);
                this.ctx.rotate(state !== 'rest' ? legAngle - Math.sin(time * 4 + x * 0.1) * 0.2 : 0);
                this.ctx.fillRect(0, 0, 3, 8);
                this.ctx.restore();
                
                // Ноги (обувь)
                this.ctx.fillStyle = '#2a1a1a';
                this.ctx.fillRect(x - 4, y + 15 + walkOffset, 2, 2);
                this.ctx.fillRect(x + 2, y + 15 - walkOffset, 2, 2);
            }
            
            // Тело (туловище) - для всех одинаково (с учетом наклонения и улучшенной детализацией)
            this.ctx.save();
            this.ctx.translate(x + bodyOffsetX, y + bodyOffsetY);
            if (agent.isBending) {
                this.ctx.rotate(-0.3); // Наклон вперед
            }
            
            // Градиент для туловища
            const bodyGradient = this.ctx.createLinearGradient(-4, -2, -4, 8);
            bodyGradient.addColorStop(0, this.lightenColor(style.clothes, 15));
            bodyGradient.addColorStop(1, style.clothes);
            this.ctx.fillStyle = bodyGradient;
            this.ctx.fillRect(-4, -2, 8, 10);
            
            // Контур туловища
            this.ctx.strokeStyle = this.darkenColor(style.clothes, 20);
            this.ctx.lineWidth = 0.5;
            this.ctx.strokeRect(-4, -2, 8, 10);
            
            // Детали одежды (пуговицы или складки)
            this.ctx.fillStyle = this.darkenColor(style.clothes, 30);
            this.ctx.beginPath();
            this.ctx.arc(0, 2, 0.8, 0, Math.PI * 2);
            this.ctx.arc(0, 5, 0.8, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
            
            // Руки (с анимацией рубки)
            this.ctx.fillStyle = style.skin;
            // Левая рука
            this.ctx.save();
            this.ctx.translate(x - 4, y + 2);
            if (agent.isChopping) {
                // Анимация рубки - руки движутся вверх-вниз синхронно
                const chopOffset = Math.sin(animFrame * 0.5) * 0.8;
                this.ctx.rotate(-armAngle + chopOffset);
            } else {
                this.ctx.rotate(-armAngle);
            }
            this.ctx.fillRect(0, 0, 2, 6);
            this.ctx.restore();
            // Правая рука
            this.ctx.save();
            this.ctx.translate(x + 4, y + 2);
            if (agent.isChopping) {
                // Анимация рубки - руки движутся вверх-вниз синхронно
                const chopOffset = Math.sin(animFrame * 0.5) * 0.8;
                this.ctx.rotate(armAngle - chopOffset);
            } else {
                this.ctx.rotate(armAngle);
            }
            this.ctx.fillRect(0, 0, 2, 6);
            this.ctx.restore();
            
            // Если рубит дерево - рисуем топор в руке
            if (agent.isChopping && agent.targetTree) {
                this.ctx.save();
                this.ctx.translate(x + 4, y + 2);
                const chopOffset = Math.sin(animFrame * 0.5) * 0.8;
                this.ctx.rotate(armAngle - chopOffset);
                this.ctx.fillStyle = '#8B4513'; // Коричневый цвет для топора
                this.ctx.fillRect(1, -2, 1, 4); // Рукоятка
                this.ctx.fillStyle = '#C0C0C0'; // Серебряный цвет для лезвия
                this.ctx.fillRect(1.5, -4, 1, 3); // Лезвие
                this.ctx.restore();
            }
            
            // Голова (с анимацией покачивания и улучшенной детализацией)
            const headRadius = 5;
            const headY = y - 8 + headBob;
            
            // Градиент для головы (объем)
            const headGradient = this.ctx.createRadialGradient(
                x - 2, headY - 2, 0,
                x, headY, headRadius
            );
            headGradient.addColorStop(0, this.lightenColor(style.skin, 20));
            headGradient.addColorStop(1, style.skin);
            this.ctx.fillStyle = headGradient;
            this.ctx.beginPath();
            this.ctx.arc(x, headY, headRadius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Контур головы
            this.ctx.strokeStyle = this.darkenColor(style.skin, 15);
            this.ctx.lineWidth = 0.5;
            this.ctx.stroke();
            
            // Волосы с улучшенной детализацией
            this.ctx.fillStyle = style.hair;
            // Основная часть волос
            this.ctx.beginPath();
            this.ctx.arc(x, headY - 1, headRadius, 0, Math.PI * 2);
            this.ctx.fill();
            // Верхняя часть волос
            this.ctx.fillRect(x - headRadius, headY - headRadius - 2, headRadius * 2, 3);
            // Боковые пряди
            this.ctx.beginPath();
            this.ctx.arc(x - headRadius + 1, headY - 1, 2, 0, Math.PI * 2);
            this.ctx.arc(x + headRadius - 1, headY - 1, 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Лицо (улучшенные глаза)
            const eyeY = headY - 1;
            // Белки глаз
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(x - 2, eyeY, 1.2, 0, Math.PI * 2);
            this.ctx.arc(x + 2, eyeY, 1.2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Радужка
            this.ctx.fillStyle = '#4a6a9a';
            this.ctx.beginPath();
            this.ctx.arc(x - 2, eyeY, 0.8, 0, Math.PI * 2);
            this.ctx.arc(x + 2, eyeY, 0.8, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Зрачки
            this.ctx.fillStyle = '#000000';
            this.ctx.beginPath();
            this.ctx.arc(x - 2, eyeY, 0.5, 0, Math.PI * 2);
            this.ctx.arc(x + 2, eyeY, 0.5, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Блики в глазах
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(x - 1.8, eyeY - 0.3, 0.2, 0, Math.PI * 2);
            this.ctx.arc(x + 2.2, eyeY - 0.3, 0.2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Нос (маленькая точка)
            this.ctx.fillStyle = this.darkenColor(style.skin, 10);
            this.ctx.beginPath();
            this.ctx.arc(x, headY + 1, 0.5, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Рот (улучшенный)
            this.ctx.strokeStyle = this.darkenColor(style.skin, 20);
            this.ctx.lineWidth = 0.8;
            this.ctx.beginPath();
            this.ctx.arc(x, headY + 2.5, 1, 0, Math.PI);
            this.ctx.stroke();
            
            // Щеки (легкий румянец)
            this.ctx.fillStyle = 'rgba(255, 200, 200, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(x - 3, headY + 1, 1.5, 0, Math.PI * 2);
            this.ctx.arc(x + 3, headY + 1, 1.5, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Индикатор здоровья (маленький кружок справа вверху)
        const healthColor = health > 70 ? '#00ff00' : 
                           health > 40 ? '#ffaa00' : '#ff0000';
        this.ctx.fillStyle = healthColor;
        this.ctx.beginPath();
        this.ctx.arc(x + 7, y - 12, 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Индикатор состояния (цветной фон за агентом)
        if (state) {
            const stateColors = {
                'explore': 'rgba(0, 255, 0, 0.2)',   // Зеленый - исследует
                'findFood': 'rgba(255, 100, 0, 0.2)', // Оранжевый - ищет еду
                'rest': 'rgba(0, 100, 255, 0.2)'     // Синий - отдыхает
            };
            this.ctx.fillStyle = stateColors[state] || 'rgba(255, 255, 255, 0.2)';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 10, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    // Вспомогательные функции для работы с цветами
    lightenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }
    
    darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    animate() {
        if (!this.isRunning) return;

        // Обновление логики мира
        this.update();

        // Отрисовка
        this.draw();

        // Продолжение анимации
        this.animationFrameId = requestAnimationFrame(() => this.animate());
    }

    update() {
        // Обновление логики мира
        // Здесь будет логика обновления дня, времени суток и т.д.
        
        // Обновление деревьев (рост и старение)
        this.updateTrees();
        
        // Обновление животных (ПЕРЕД хищниками, чтобы они могли их видеть)
        this.updateAnimals();
        
        // Обновление хищников
        this.updatePredators();
        
        // Обновление агентов (если есть)
        if (window.agents) {
            // window.agents.update() вызывается в Simulation.gameLoop()
            // Не вызываем здесь, чтобы избежать двойного обновления
        }
    }
    
    // Обновление жизненного цикла деревьев
    updateTrees() {
        if (!this.terrain || !this.terrain.forest) return;
        
        // Используем константы из GAME_CONFIG, если доступны, иначе значения по умолчанию
        const TREE_CONFIG = window.GAME_CONFIG?.TREES || {
            GROWTH_RATE: 0.1,
            AGE_RATE: 0.05,
            MATURE_AGE: 30,
            OLD_AGE: 100,
            DEAD_AGE: 200,
            MIN_SIZE: 10,
            MAX_SIZE: 30
        };
        
        this.terrain.forest.forEach(tree => {
            if (!tree) return;
            
            // Увеличиваем возраст дерева
            tree.age = (tree.age || 0) + TREE_CONFIG.AGE_RATE;
            
            // Обновляем размер дерева (растет до зрелости)
            if (tree.age < TREE_CONFIG.MATURE_AGE && tree.size < TREE_CONFIG.MAX_SIZE) {
                tree.size = Math.min(
                    TREE_CONFIG.MAX_SIZE,
                    (tree.size || TREE_CONFIG.MIN_SIZE) + TREE_CONFIG.GROWTH_RATE
                );
            }
            
            // Обновляем состояние дерева в зависимости от возраста
            if (tree.age >= TREE_CONFIG.DEAD_AGE) {
                tree.state = 'dead_stump';
            } else if (tree.age >= TREE_CONFIG.OLD_AGE) {
                tree.state = 'old';
            } else if (tree.age >= TREE_CONFIG.MATURE_AGE) {
                tree.state = 'mature';
            } else {
                tree.state = 'young';
            }
        });
    }
    
    // Получить дерево по координатам (для рубки)
    getTreeAt(x, y, radius = 20) {
        if (!this.terrain || !this.terrain.forest) return null;
        
        for (const tree of this.terrain.forest) {
            if (!tree) continue;
            const dx = tree.x - x;
            const dy = tree.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= radius) {
                return tree;
            }
        }
        return null;
    }
    
    // Рубка дерева (превращает в дрова)
    chopTree(treeId) {
        if (!this.terrain || !this.terrain.forest) return null;
        
        const treeIndex = this.terrain.forest.findIndex(t => t && t.id === treeId);
        if (treeIndex === -1) return null;
        
        const tree = this.terrain.forest[treeIndex];
        // Используем количество дров из дерева, если оно задано, иначе используем значение по умолчанию
        const woodAmount = tree.woodAmount || window.GAME_CONFIG?.TREES?.WOOD_PER_TREE || 3;
        
        // Удаляем дерево из леса
        this.terrain.forest.splice(treeIndex, 1);
        
        // Возвращаем количество дров
        return {
            type: 'wood',
            amount: woodAmount,
            x: tree.x,
            y: tree.y
        };
    }
    
    updatePredators() {
        // Обновление логики хищников
        this.predators.forEach(predator => {
            // Инициализируем страх хищника, если его нет
            if (predator.fear === undefined) {
                predator.fear = 0;
            }
            
            // Уменьшаем страх со временем
            predator.fear = Math.max(0, (predator.fear || 0) - 0.5);
            
            // Увеличение голода
            predator.hunger += 0.3;
            if (predator.hunger > 100) predator.hunger = 100;
            
            // Хищники могут есть еду агентов, если они голодны и находятся рядом
            if (predator.hunger > 60 && window.agents) {
                const allAgents = window.agents.getAllAgents();
                for (const agent of allAgents) {
                    if (!agent.position) continue;
                    const dx = agent.position.x - predator.x;
                    const dy = agent.position.y - predator.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Если хищник рядом с агентом (в пределах 25 пикселей)
                    if (distance < 25) {
                        // Ищем еду в foodStorage агента
                        if (agent.foodStorage && agent.foodStorage.length > 0) {
                            const foodItem = agent.foodStorage.find(f => f.amount > 0);
                            if (foodItem) {
                                // Хищник ест еду
                                foodItem.amount--;
                                predator.hunger = Math.max(0, predator.hunger - 40);
                                
                                if (foodItem.amount <= 0) {
                                    const index = agent.foodStorage.indexOf(foodItem);
                                    if (index > -1) agent.foodStorage.splice(index, 1);
                                }
                                
                                if (window.addLogEntry && Math.random() < 0.1) {
                                    window.addLogEntry(`🐺 ${this.getPredatorName(predator.type)} съел еду у ${agent.name}`);
                                }
                                break; // Хищник наелся
                            }
                        }
                        
                        // Если не нашли в foodStorage, ищем в inventory
                        if (agent.inventory && agent.inventory.length > 0) {
                            const foodTypes = ['berries', 'mushrooms', 'fish', 'meat', 'apple', 'potato', 'bread', 'bird'];
                            const foodItem = agent.inventory.find(item => foodTypes.includes(item.type) && item.amount > 0);
                            if (foodItem) {
                                // Хищник ест еду из инвентаря
                                foodItem.amount--;
                                predator.hunger = Math.max(0, predator.hunger - 40);
                                
                                if (foodItem.amount <= 0) {
                                    const index = agent.inventory.indexOf(foodItem);
                                    if (index > -1) agent.inventory.splice(index, 1);
                                }
                                
                                if (window.addLogEntry && Math.random() < 0.1) {
                                    window.addLogEntry(`🐺 ${this.getPredatorName(predator.type)} съел еду у ${agent.name}`);
                                }
                                break; // Хищник наелся
                            }
                        }
                    }
                }
            }
            
            // Проверяем, есть ли рядом агенты, которые атакуют хищника
            if (window.agents && window.agents.agents) {
                window.agents.agents.forEach(agent => {
                    if (agent.attackTarget && agent.attackTarget.type === 'predator' && agent.attackTarget.obj === predator) {
                        const dx = agent.position.x - predator.x;
                        const dy = agent.position.y - predator.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        // Если агент атакует хищника близко - увеличиваем страх
                        if (distance < 80) {
                            const huntingSkill = agent.experience.hunting || 0;
                            predator.fear = Math.min(100, (predator.fear || 0) + (2 + huntingSkill * 0.1));
                        }
                    }
                });
            }
            
            // Если хищник в страхе (fear > 50), он может убежать
            const isScared = (predator.fear || 0) > 50;
            
            // Поиск цели для атаки (если не в страхе)
            if (!isScared && (!predator.target || predator.hunger > 70)) {
                predator.target = this.findNearestPrey(predator);
            } else if (isScared) {
                // Если в страхе - убегаем от ближайшего агента
                predator.target = null;
                if (window.agents && window.agents.agents) {
                    let nearestAgent = null;
                    let minDistance = Infinity;
                    window.agents.agents.forEach(agent => {
                        const ax = agent.position ? agent.position.x : agent.x;
                        const ay = agent.position ? agent.position.y : agent.y;
                        const distance = Math.sqrt(Math.pow(ax - predator.x, 2) + Math.pow(ay - predator.y, 2));
                        if (distance < minDistance && distance < 150) {
                            minDistance = distance;
                            nearestAgent = { x: ax, y: ay };
                        }
                    });
                    
                    if (nearestAgent) {
                        // Убегаем от агента
                        const dx = predator.x - nearestAgent.x;
                        const dy = predator.y - nearestAgent.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 0) {
                            predator.x += (dx / dist) * predator.speed * 1.5;
                            predator.y += (dy / dist) * predator.speed * 1.5;
                        }
                    }
                }
            }
            
            // Движение к цели или случайное движение (если не в страхе)
            if (!isScared && predator.target) {
                const dx = predator.target.x - predator.x;
                const dy = predator.target.y - predator.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > predator.size) {
                    // Движение к цели
                    predator.x += (dx / distance) * predator.speed;
                    predator.y += (dy / distance) * predator.speed;
                } else {
                    // Атака цели
                    this.attackTarget(predator, predator.target);
                }
            } else if (!isScared) {
                // Случайное движение
                predator.direction += (Math.random() - 0.5) * 0.2;
                predator.x += Math.cos(predator.direction) * predator.speed * 0.5;
                predator.y += Math.sin(predator.direction) * predator.speed * 0.5;
            }
            
            // Бесконечный мир - не ограничиваем границами
        });
    }
    
    findNearestPrey(predator) {
        let nearest = null;
        let minDistance = Infinity;
        
        // Ищем агентов
        if (window.agents) {
            window.agents.getAllAgents().forEach(agent => {
                const ax = agent.position ? agent.position.x : agent.x;
                const ay = agent.position ? agent.position.y : agent.y;
                const distance = Math.sqrt(Math.pow(ax - predator.x, 2) + Math.pow(ay - predator.y, 2));
                if (distance < minDistance && distance < 200) {
                    minDistance = distance;
                    nearest = { x: ax, y: ay, type: 'agent', obj: agent };
                }
            });
        }
        
        // Ищем животных
        this.animals.forEach(animal => {
            const distance = Math.sqrt(Math.pow(animal.x - predator.x, 2) + Math.pow(animal.y - predator.y, 2));
            if (distance < minDistance && distance < 150) {
                minDistance = distance;
                nearest = { x: animal.x, y: animal.y, type: 'animal', obj: animal };
            }
        });
        
        return nearest;
    }
    
    attackTarget(predator, target) {
        if (target.type === 'agent') {
            // Атака агента
            const agent = target.obj;
            agent.health -= 5;
            if (agent.health < 0) agent.health = 0;
            
            // Добавляем страх и панику
            agent.fear = Math.min(100, (agent.fear || 0) + 30);
            if (agent.fear > 70) {
                agent.panic = true;
                agent.mood = 'anxious';
            }
            
            predator.hunger -= 20;
            if (predator.hunger < 0) predator.hunger = 0;
            
            if (window.addLogEntry) {
                window.addLogEntry(`⚠️ ${this.getPredatorName(predator.type)} атакует ${agent.name}! ${agent.panic ? '😱 ПАНИКА!' : '😨 Страх!'}`);
            }
        } else if (target.type === 'animal') {
            // Атака животного
            const animal = target.obj;
            animal.health -= 10;
            if (animal.health <= 0) {
                // Животное убито
                const index = this.animals.indexOf(animal);
                if (index > -1) {
                    this.animals.splice(index, 1);
                }
                // Добавляем мясо на место убийства
                this.resources.push({
                    type: 'meat',
                    x: animal.x,
                    y: animal.y,
                    amount: 3
                });
                predator.hunger -= 30;
                if (predator.hunger < 0) predator.hunger = 0;
                
                if (window.addLogEntry) {
                    window.addLogEntry(`💀 ${this.getPredatorName(predator.type)} убил ${this.getAnimalName(animal.type)}`);
                }
            }
        }
        predator.target = null;
    }
    
    updateAnimals() {
        // Обновление логики животных
        this.animals.forEach(animal => {
            // Инициализация свойств, если их нет
            if (!animal.speed) animal.speed = 1;
            if (animal.direction === undefined) animal.direction = Math.random() * Math.PI * 2;
            if (!animal.health) animal.health = 100;
            if (animal.hunger === undefined) animal.hunger = 50;
            
            // Увеличение голода
            animal.hunger += 0.2;
            if (animal.hunger > 100) animal.hunger = 100;
            
            // Животные могут есть еду агентов, если они голодны и находятся рядом
            if (animal.hunger > 60 && window.agents && !animal.owner) {
                const allAgents = window.agents.getAllAgents();
                for (const agent of allAgents) {
                    if (!agent.position) continue;
                    const dx = agent.position.x - animal.x;
                    const dy = agent.position.y - animal.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Если животное рядом с агентом (в пределах 25 пикселей)
                    if (distance < 25) {
                        // Ищем еду в foodStorage агента
                        if (agent.foodStorage && agent.foodStorage.length > 0) {
                            const foodItem = agent.foodStorage.find(f => f.amount > 0);
                            if (foodItem) {
                                // Животное ест еду
                                foodItem.amount--;
                                animal.hunger = Math.max(0, animal.hunger - 30);
                                
                                if (foodItem.amount <= 0) {
                                    const index = agent.foodStorage.indexOf(foodItem);
                                    if (index > -1) agent.foodStorage.splice(index, 1);
                                }
                                
                                if (window.addLogEntry && Math.random() < 0.1) {
                                    window.addLogEntry(`🐾 ${this.getAnimalName(animal.type)} съело еду у ${agent.name}`);
                                }
                                break; // Животное наелось
                            }
                        }
                        
                        // Если не нашли в foodStorage, ищем в inventory
                        if (agent.inventory && agent.inventory.length > 0) {
                            const foodTypes = ['berries', 'mushrooms', 'fish', 'meat', 'apple', 'potato', 'bread'];
                            const foodItem = agent.inventory.find(item => foodTypes.includes(item.type) && item.amount > 0);
                            if (foodItem) {
                                // Животное ест еду из инвентаря
                                foodItem.amount--;
                                animal.hunger = Math.max(0, animal.hunger - 30);
                                
                                if (foodItem.amount <= 0) {
                                    const index = agent.inventory.indexOf(foodItem);
                                    if (index > -1) agent.inventory.splice(index, 1);
                                }
                                
                                if (window.addLogEntry && Math.random() < 0.1) {
                                    window.addLogEntry(`🐾 ${this.getAnimalName(animal.type)} съело еду у ${agent.name}`);
                                }
                                break; // Животное наелось
                            }
                        }
                    }
                }
            }
            
            // Логика расположения животных возле водоёма (но не в водоёме)
            if (!animal.owner && this.terrain && this.terrain.pond) {
                const pond = this.terrain.pond;
                const dx = pond.centerX - animal.x;
                const dy = pond.centerY - animal.y;
                const distanceToPondCenter = Math.sqrt(dx * dx + dy * dy);
                
                // Вычисляем расстояние до края пруда (эллипс)
                const angle = Math.atan2(dy, dx);
                const a = pond.radiusX;
                const b = pond.radiusY;
                const cosAngle = Math.cos(angle);
                const sinAngle = Math.sin(angle);
                const distanceToEdge = Math.sqrt(a * a * cosAngle * cosAngle + b * b * sinAngle * sinAngle);
                const distanceFromEdge = distanceToPondCenter - distanceToEdge;
                
                // Животные должны быть возле водоёма (в пределах 50-150 пикселей от края), но не входить в водоём
                const minDistance = 50; // Минимальное расстояние от края пруда
                const maxDistance = 150; // Максимальное расстояние от края пруда
                
                if (distanceFromEdge < minDistance || distanceFromEdge > maxDistance) {
                    // Животное слишком далеко или слишком близко - двигаемся к правильной позиции
                    const targetDistance = minDistance + (maxDistance - minDistance) / 2; // Целевое расстояние (100 пикселей)
                    const targetAngle = Math.atan2(dy, dx);
                    const targetX = pond.centerX + Math.cos(targetAngle) * (distanceToEdge + targetDistance);
                    const targetY = pond.centerY + Math.sin(targetAngle) * (distanceToEdge + targetDistance);
                    
                    // Двигаемся к целевой позиции
                    const targetDx = targetX - animal.x;
                    const targetDy = targetY - animal.y;
                    const targetDist = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
                    
                    if (targetDist > 5) {
                        animal.x += (targetDx / targetDist) * (animal.speed || 0.5);
                        animal.y += (targetDy / targetDist) * (animal.speed || 0.5);
                    }
                } else {
                    // Животное в правильной позиции - случайное движение вокруг водоёма
                    if (animal.direction === undefined) {
                        animal.direction = Math.random() * Math.PI * 2;
                    }
                    // Двигаемся по кругу вокруг водоёма
                    animal.direction += (Math.random() - 0.5) * 0.1;
                    const speed = animal.speed || 0.5;
                    animal.x += Math.cos(animal.direction) * speed;
                    animal.y += Math.sin(animal.direction) * speed;
                    
                    // Проверяем, не вошли ли в водоём после движения
                    const newDx = pond.centerX - animal.x;
                    const newDy = pond.centerY - animal.y;
                    const newDistanceToPondCenter = Math.sqrt(newDx * newDx + newDy * newDy);
                    const newAngle = Math.atan2(newDy, newDx);
                    const newCosAngle = Math.cos(newAngle);
                    const newSinAngle = Math.sin(newAngle);
                    const newDistanceToEdge = Math.sqrt(a * a * newCosAngle * newCosAngle + b * b * newSinAngle * newSinAngle);
                    const newDistanceFromEdge = newDistanceToPondCenter - newDistanceToEdge;
                    
                    // Если вошли в водоём - откатываем движение
                    if (newDistanceFromEdge < 0) {
                        animal.x -= Math.cos(animal.direction) * speed;
                        animal.y -= Math.sin(animal.direction) * speed;
                        animal.direction += Math.PI; // Разворачиваемся
                    }
                }
            } else if (animal.owner && window.agents) {
                // Если есть владелец, двигаемся к нему
                const ownerAgent = window.agents.getAgentById(animal.owner);
                let foundOwner = ownerAgent;
                
                if (!foundOwner) {
                    // Пробуем найти по ownerId
                    const allAgents = window.agents.getAllAgents();
                    foundOwner = allAgents.find(a => a.id === animal.owner || a.ownerId === animal.owner);
                }
                
                if (foundOwner) {
                    const ax = foundOwner.position ? foundOwner.position.x : (foundOwner.x || 0);
                    const ay = foundOwner.position ? foundOwner.position.y : (foundOwner.y || 0);
                    const dx = ax - animal.x;
                    const dy = ay - animal.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 30 && distance > 0) {
                        animal.x += (dx / distance) * (animal.speed || 1);
                        animal.y += (dy / distance) * (animal.speed || 1);
                    }
                } else {
                    // Владелец не найден - случайное движение
                    animal.direction += (Math.random() - 0.5) * 0.1;
                    animal.x += Math.cos(animal.direction) * (animal.speed || 1);
                    animal.y += Math.sin(animal.direction) * (animal.speed || 1);
                }
            } else {
                // Случайное движение - ВСЕГДА ДВИГАЕМСЯ
                if (animal.direction === undefined) {
                    animal.direction = Math.random() * Math.PI * 2;
                }
                animal.direction += (Math.random() - 0.5) * 0.1;
                const speed = animal.speed || 0.5;
                animal.x += Math.cos(animal.direction) * speed;
                animal.y += Math.sin(animal.direction) * speed;
            }
            
            // Бесконечный мир - не ограничиваем границами
        });
    }
}

// Глобальный экземпляр мира будет создан в main.js после загрузки DOM
