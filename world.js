// Модуль для работы с миром и canvas

class World {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = null;
        this.day = 1;
        this.timeOfDay = 'day'; // day, night
        this.weather = 'sunny'; // sunny, rain, night
        this.isRunning = false;
        this.simulationSpeed = 5;
        this.animationFrameId = null;
        this.resources = [];
        this.fires = []; // Массив костров [{x, y, intensity}]
        this.animals = []; // Массив животных [{type, x, y, ...}]
        this.predators = []; // Массив хищников
        
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

    addFire(x, y) {
        // Добавление костра на карту
        const fire = {
            x: x,
            y: y,
            intensity: 1.0, // Интенсивность костра (для анимации)
            time: Date.now(), // Время создания для анимации
            id: 'fire_' + Date.now() + '_' + Math.random() // Уникальный ID для синхронизации
        };
        this.fires.push(fire);
        this.draw();
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
        
        this.animals.push({
            id: animalId,
            type: type,
            x: x,
            y: y,
            direction: Math.random() * Math.PI * 2, // Направление движения
            speed: 0.5 + Math.random() * 0.5, // Скорость движения
            size: this.getAnimalSize(type),
            health: 100,
            hunger: 0,
            owner: null, // Владелец (если домашнее животное)
            tamed: false // Приручено ли животное
        });
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
        
        this.predators.push({
            id: predatorId,
            type: type,
            x: x,
            y: y,
            direction: Math.random() * Math.PI * 2,
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
        const treeCount = 100; // Увеличено для бесконечного мира
        const worldSize = Math.max(width, height) * 3; // Генерируем в большем диапазоне
        for (let i = 0; i < treeCount; i++) {
            this.terrain.forest.push({
                x: (Math.random() - 0.5) * worldSize,
                y: (Math.random() - 0.5) * worldSize,
                size: 15 + Math.random() * 10 // Размер дерева
            });
        }
        
        // Создание пруда (овал в центре начальной области)
        this.terrain.pond = {
            centerX: 0,
            centerY: 0,
            radiusX: width * 0.15,
            radiusY: height * 0.12
        };
        
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

    addResource(type) {
        // Добавление ресурса на случайную позицию в видимой области
        if (!this.canvas) return;
        
        // Вычисляем размеры видимой области
        const viewWidth = this.canvas.width / this.camera.scale;
        const viewHeight = this.canvas.height / this.camera.scale;
        
        // Случайная позиция в видимой области с отступом от краев
        const margin = 50;
        const x = this.camera.x + margin + Math.random() * (viewWidth - margin * 2);
        const y = this.camera.y + margin + Math.random() * (viewHeight - margin * 2);
        
        // Определяем количество в зависимости от типа
        let amount = 1;
        if (type === 'berries') amount = 10;
        else if (['meat', 'bird', 'fish', 'cooked_food'].includes(type)) amount = 1;
        else if (type === 'money') amount = 10 + Math.floor(Math.random() * 50);
        else if (type === 'wood') amount = 5;
        
        const resource = {
            type: type,
            x: x,
            y: y,
            amount: amount,
            id: 'resource_' + Date.now() + '_' + Math.random() // Уникальный ID для синхронизации
        };
        
        this.resources.push(resource);
        
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
        if (!this.ctx || !this.canvas) return;

        const width = this.canvas.width;
        const height = this.canvas.height;

        // Очистка canvas
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

        // Отрисовка пруда (реалистичная вода)
        if (this.terrain.pond) {
            // Градиент для воды
            const waterGradient = this.ctx.createRadialGradient(
                this.terrain.pond.centerX - this.terrain.pond.radiusX * 0.3,
                this.terrain.pond.centerY - this.terrain.pond.radiusY * 0.3,
                0,
                this.terrain.pond.centerX,
                this.terrain.pond.centerY,
                Math.max(this.terrain.pond.radiusX, this.terrain.pond.radiusY)
            );
            waterGradient.addColorStop(0, '#4a7a9a'); // Светлее в центре
            waterGradient.addColorStop(1, '#1a3a5a'); // Темнее по краям
            
            this.ctx.fillStyle = waterGradient;
            this.ctx.beginPath();
            this.ctx.ellipse(
                this.terrain.pond.centerX,
                this.terrain.pond.centerY,
                this.terrain.pond.radiusX,
                this.terrain.pond.radiusY,
                0,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
            
            // Берег пруда (темная обводка)
            this.ctx.strokeStyle = '#1a2a1a';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            
            // Отражения/рябь на воде
            this.ctx.fillStyle = 'rgba(150, 200, 255, 0.2)';
            for (let i = 0; i < 5; i++) {
                const rippleX = this.terrain.pond.centerX + (Math.random() - 0.5) * this.terrain.pond.radiusX;
                const rippleY = this.terrain.pond.centerY + (Math.random() - 0.5) * this.terrain.pond.radiusY;
                this.ctx.beginPath();
                this.ctx.arc(rippleX, rippleY, 8 + Math.random() * 5, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // Отрисовка деревьев (реалистичные)
        this.terrain.forest.forEach(tree => {
            // Тень дерева
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            this.ctx.beginPath();
            this.ctx.ellipse(tree.x + 3, tree.y + tree.size * 0.6 + 2, tree.size * 0.3, tree.size * 0.15, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Ствол дерева (коричневый, с текстурой)
            const trunkHeight = tree.size * 0.6;
            const trunkWidth = 4 + tree.size * 0.1;
            
            // Основной ствол
            this.ctx.fillStyle = '#6b4a3a';
            this.ctx.fillRect(tree.x - trunkWidth/2, tree.y, trunkWidth, trunkHeight);
            
            // Текстура ствола (темные линии)
            this.ctx.strokeStyle = '#4a2a1a';
            this.ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                this.ctx.beginPath();
                this.ctx.moveTo(tree.x - trunkWidth/2 + i * 2, tree.y);
                this.ctx.lineTo(tree.x - trunkWidth/2 + i * 2, tree.y + trunkHeight);
                this.ctx.stroke();
            }
            
            // Крона дерева (несколько слоев для объема)
            const crownRadius = tree.size * 0.5;
            
            // Внешний слой (темнее)
            this.ctx.fillStyle = '#1a4a1a';
            this.ctx.beginPath();
            this.ctx.arc(tree.x, tree.y - 2, crownRadius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Средний слой
            this.ctx.fillStyle = '#2a6a2a';
            this.ctx.beginPath();
            this.ctx.arc(tree.x - 2, tree.y - 4, crownRadius * 0.8, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Внутренний слой (светлее)
            this.ctx.fillStyle = '#3a8a3a';
            this.ctx.beginPath();
            this.ctx.arc(tree.x + 2, tree.y - 3, crownRadius * 0.6, 0, Math.PI * 2);
            this.ctx.fill();
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
                const berryCount = 5;
                for (let i = 0; i < berryCount; i++) {
                    const offsetX = (Math.random() - 0.5) * 8;
                    const offsetY = (Math.random() - 0.5) * 8;
                    const berryX = resource.x + offsetX;
                    const berryY = resource.y + offsetY;
                    
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

        // Отрисовка агентов (если есть)
        if (window.agents) {
            const allAgents = window.agents.getAllAgents();
            allAgents.forEach(agent => {
                this.drawAgent(agent);
            });
        }
        
        // Восстанавливаем контекст (убираем трансформацию камеры)
        this.ctx.restore();
        
        // Отрисовка подсказок поверх всего (в координатах экрана)
        if (this.mouse.hoveredObject) {
            this.drawTooltip(this.mouse.hoveredObject);
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
            additionalInfo = ` (Здоровье: ${Math.floor(agent.health)}%, Голод: ${Math.floor(agent.hunger)}%)`;
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
    }

    drawResource(resource) {
        if (!this.ctx) return;
        
        const x = resource.x;
        const y = resource.y;
        const type = resource.type;
        
        // Инструменты
        if (['saw', 'axe', 'hammer', 'pickaxe', 'shovel', 'fishing_rod'].includes(type)) {
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
            }
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

    drawAgent(agent) {
        if (!this.ctx) return;

        const x = agent.position ? agent.position.x : (agent.x || 100);
        const y = agent.position ? agent.position.y : (agent.y || 100);
        const state = agent.state || 'explore';
        const health = agent.health !== undefined ? agent.health : 100;
        const time = Date.now() / 1000;
        
        // Проверяем, выбран ли этот агент
        const isSelected = window.simulation && window.simulation.selectedAgent === agent;
        
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
        
        // Анимация движения (покачивание при ходьбе)
        const walkOffset = state !== 'rest' ? Math.sin(time * 4 + x * 0.1) * 1.5 : 0;
        const headBob = state !== 'rest' ? Math.sin(time * 4 + x * 0.1) * 0.5 : 0;
        
        // Тень человека
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(x + 2, y + 18, 6, 3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Определение позы в зависимости от состояния (с анимацией)
        let armAngle = 0;
        let legAngle = 0;
        if (state === 'rest') {
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
        
        // Тело (туловище)
        this.ctx.fillStyle = style.clothes;
        this.ctx.fillRect(x - 4, y - 2, 8, 10);
        
        // Руки
        this.ctx.fillStyle = style.skin;
        // Левая рука
        this.ctx.save();
        this.ctx.translate(x - 4, y + 2);
        this.ctx.rotate(-armAngle);
        this.ctx.fillRect(0, 0, 2, 6);
        this.ctx.restore();
        // Правая рука
        this.ctx.save();
        this.ctx.translate(x + 4, y + 2);
        this.ctx.rotate(armAngle);
        this.ctx.fillRect(0, 0, 2, 6);
        this.ctx.restore();
        
        // Голова (с анимацией покачивания)
        this.ctx.fillStyle = style.skin;
        this.ctx.beginPath();
        this.ctx.arc(x, y - 8 + headBob, 5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Волосы
        this.ctx.fillStyle = style.hair;
        this.ctx.beginPath();
        this.ctx.arc(x, y - 9 + headBob, 5, 0, Math.PI * 2);
        this.ctx.fill();
        // Верхняя часть волос
        this.ctx.fillRect(x - 5, y - 12 + headBob, 10, 3);
        
        // Лицо (глаза)
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(x - 2, y - 9 + headBob, 1, 0, Math.PI * 2);
        this.ctx.arc(x + 2, y - 9 + headBob, 1, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(x - 2, y - 9 + headBob, 0.5, 0, Math.PI * 2);
        this.ctx.arc(x + 2, y - 9 + headBob, 0.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Рот (простая линия)
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 0.5;
        this.ctx.beginPath();
        this.ctx.arc(x, y - 7 + headBob, 1, 0, Math.PI);
        this.ctx.stroke();
        
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
        
        // Обновление хищников
        this.updatePredators();
        
        // Обновление животных
        this.updateAnimals();
        
        if (window.agents) {
            window.agents.update();
            window.agents.updateAllAgentsUI();
        }
    }
    
    updatePredators() {
        // Обновление логики хищников
        this.predators.forEach(predator => {
            // Увеличение голода
            predator.hunger += 0.3;
            if (predator.hunger > 100) predator.hunger = 100;
            
            // Поиск цели для атаки
            if (!predator.target || predator.hunger > 70) {
                predator.target = this.findNearestPrey(predator);
            }
            
            // Движение к цели или случайное движение
            if (predator.target) {
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
            } else {
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
            predator.hunger -= 20;
            if (predator.hunger < 0) predator.hunger = 0;
            
            if (window.addLogEntry) {
                window.addLogEntry(`⚠️ ${this.getPredatorName(predator.type)} атакует ${agent.name}!`);
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
            // Увеличение голода
            animal.hunger += 0.2;
            if (animal.hunger > 100) animal.hunger = 100;
            
            // Если есть владелец, двигаемся к нему
            if (animal.owner && window.agents) {
                const owner = window.agents.getAgent(animal.owner);
                if (owner) {
                    const ax = owner.position ? owner.position.x : owner.x;
                    const ay = owner.position ? owner.position.y : owner.y;
                    const dx = ax - animal.x;
                    const dy = ay - animal.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 30) {
                        animal.x += (dx / distance) * animal.speed;
                        animal.y += (dy / distance) * animal.speed;
                    }
                }
            } else {
                // Случайное движение
                animal.direction += (Math.random() - 0.5) * 0.1;
                animal.x += Math.cos(animal.direction) * animal.speed;
                animal.y += Math.sin(animal.direction) * animal.speed;
            }
            
            // Бесконечный мир - не ограничиваем границами
        });
    }
}

// Глобальный экземпляр мира будет создан в main.js после загрузки DOM
