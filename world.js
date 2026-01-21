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
        this.generateTerrain();
        this.updateUI();
        this.draw();
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
        
        // Генерация леса (деревья)
        this.terrain.forest = [];
        const treeCount = 25;
        for (let i = 0; i < treeCount; i++) {
            this.terrain.forest.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: 15 + Math.random() * 10 // Размер дерева
            });
        }
        
        // Создание пруда (овал в центре)
        this.terrain.pond = {
            centerX: width / 2,
            centerY: height / 2,
            radiusX: width * 0.15,
            radiusY: height * 0.12
        };
        
        // Полянка (область вокруг пруда)
        this.terrain.clearing = {
            centerX: width / 2,
            centerY: height / 2,
            radius: Math.min(width, height) * 0.2
        };
        
        // Генерация камней
        this.terrain.stones = [];
        const stoneCount = 15;
        for (let i = 0; i < stoneCount; i++) {
            this.terrain.stones.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: 5 + Math.random() * 8
            });
        }
        
        // Генерация кустов с ягодами
        this.terrain.berryBushes = [];
        const bushCount = 12;
        for (let i = 0; i < bushCount; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
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
        // Добавление ресурса на случайную позицию
        if (!this.canvas) return;
        
        const x = Math.random() * (this.canvas.width - 20) + 10;
        const y = Math.random() * (this.canvas.height - 20) + 10;
        
        this.resources.push({
            type: type,
            x: x,
            y: y,
            amount: type === 'berries' ? 10 : 5
        });
        
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

        // Фон (трава/поляна) в зависимости от времени суток и погоды
        if (this.weather === 'night' || this.timeOfDay === 'night') {
            this.ctx.fillStyle = '#1a1a2e';
        } else if (this.weather === 'rain') {
            this.ctx.fillStyle = '#2a3a2a';
        } else {
            this.ctx.fillStyle = '#3a5a3a'; // Зеленый цвет травы
        }
        this.ctx.fillRect(0, 0, width, height);

        // Отрисовка полянки (светлее фон)
        if (this.terrain.clearing) {
            this.ctx.fillStyle = '#4a6a4a';
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

        // Отрисовка пруда
        if (this.terrain.pond) {
            this.ctx.fillStyle = '#2a4a6a'; // Синий цвет воды
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
            
            // Обводка пруда
            this.ctx.strokeStyle = '#1a3a5a';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        // Отрисовка деревьев (лес)
        this.terrain.forest.forEach(tree => {
            // Ствол дерева
            this.ctx.fillStyle = '#5a3a2a';
            this.ctx.fillRect(tree.x - 3, tree.y, 6, tree.size * 0.6);
            
            // Крона дерева
            this.ctx.fillStyle = '#2a5a2a';
            this.ctx.beginPath();
            this.ctx.arc(tree.x, tree.y, tree.size * 0.5, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Отрисовка камней
        this.terrain.stones.forEach(stone => {
            this.ctx.fillStyle = '#5a5a5a';
            this.ctx.beginPath();
            this.ctx.arc(stone.x, stone.y, stone.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Тень камня
            this.ctx.fillStyle = '#3a3a3a';
            this.ctx.beginPath();
            this.ctx.arc(stone.x + 1, stone.y + 1, stone.size * 0.7, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Отрисовка кустов с ягодами
        this.terrain.berryBushes.forEach(bush => {
            // Куст (зеленый круг)
            this.ctx.fillStyle = '#3a6a2a';
            this.ctx.beginPath();
            this.ctx.arc(bush.x, bush.y, 12, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Ягоды на кусте
            if (bush.berries > 0) {
                this.ctx.fillStyle = '#ff4444';
                for (let i = 0; i < Math.min(bush.berries, 5); i++) {
                    const angle = (i / 5) * Math.PI * 2;
                    const berryX = bush.x + Math.cos(angle) * 8;
                    const berryY = bush.y + Math.sin(angle) * 8;
                    this.ctx.beginPath();
                    this.ctx.arc(berryX, berryY, 3, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        });

        // Отрисовка дополнительных ресурсов (ягоды и дрова, добавленные вручную)
        this.resources.forEach(resource => {
            if (resource.type === 'berries') {
                // Ягоды - красные круги
                this.ctx.fillStyle = '#ff4444';
                this.ctx.beginPath();
                this.ctx.arc(resource.x, resource.y, 6, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Обводка ягод
                this.ctx.strokeStyle = '#cc0000';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            } else if (resource.type === 'wood') {
                // Дрова - коричневые прямоугольники
                this.ctx.fillStyle = '#8b4513';
                this.ctx.fillRect(resource.x - 8, resource.y - 4, 16, 8);
                
                // Текстура дров
                this.ctx.strokeStyle = '#6b3513';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(resource.x - 8, resource.y - 4, 16, 8);
            }
        });

        // Отрисовка агентов (если есть)
        if (window.agents) {
            const allAgents = window.agents.getAllAgents();
            allAgents.forEach(agent => {
                this.drawAgent(agent);
            });
        }
    }

    drawAgent(agent) {
        if (!this.ctx) return;

        const x = agent.position ? agent.position.x : (agent.x || 100);
        const y = agent.position ? agent.position.y : (agent.y || 100);

        // Базовые цвета для типов агентов (используются как основа)
        const baseColors = {
            'man': '#4a9eff',
            'woman': '#ff4a9e',
            'boy': '#9eff4a',
            'girl': '#ff9e4a',
            'oldman': '#9e4aff',
            'oldwoman': '#ff4aff'
        };

        // Цвет в зависимости от состояния агента
        let agentColor = baseColors[agent.type] || '#ffffff';
        const state = agent.state || 'explore';
        
        // Визуализация состояний: меняем цвет в зависимости от состояния
        if (state === 'findFood') {
            // Голодный - красноватый оттенок
            agentColor = '#ff6666';
        } else if (state === 'rest') {
            // Отдыхает - синий оттенок
            agentColor = '#6666ff';
        } else if (state === 'explore') {
            // Исследует - зеленоватый оттенок
            agentColor = '#66ff66';
        }

        // Отрисовка агента
        this.ctx.fillStyle = agentColor;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 12, 0, Math.PI * 2);
        this.ctx.fill();

        // Обводка в зависимости от здоровья
        const health = agent.health !== undefined ? agent.health : 100;
        this.ctx.strokeStyle = health > 70 ? '#00ff00' : 
                               health > 40 ? '#ffaa00' : '#ff0000';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Индикатор состояния (маленький кружок сверху)
        if (agent.state) {
            const stateColors = {
                'explore': '#00ff00',  // Зеленый - исследует
                'findFood': '#ff6600', // Оранжевый - ищет еду
                'rest': '#0066ff'      // Синий - отдыхает
            };
            this.ctx.fillStyle = stateColors[agent.state] || '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(x, y - 18, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Отображение имени агента (опционально, для отладки)
        // this.ctx.fillStyle = '#ffffff';
        // this.ctx.font = '10px Arial';
        // this.ctx.fillText(agent.name.substring(0, 4), x - 10, y - 22);
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
        
        if (window.agents) {
            window.agents.update();
            window.agents.updateAllAgentsUI();
        }
    }
}

// Глобальный экземпляр мира будет создан в main.js после загрузки DOM
