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
        this.fires = []; // Очищаем костры
        this.animals = []; // Очищаем животных
        this.generateTerrain();
        this.updateUI();
        this.draw();
    }

    addFire(x, y) {
        // Добавление костра на карту
        this.fires.push({
            x: x,
            y: y,
            intensity: 1.0, // Интенсивность костра (для анимации)
            time: Date.now() // Время создания для анимации
        });
        this.draw();
    }

    addAnimal(type) {
        // Добавление животного на карту
        if (!this.canvas) return;
        
        const x = Math.random() * (this.canvas.width - 40) + 20;
        const y = Math.random() * (this.canvas.height - 40) + 20;
        
        this.animals.push({
            type: type,
            x: x,
            y: y,
            direction: Math.random() * Math.PI * 2, // Направление движения
            speed: 0.5 + Math.random() * 0.5, // Скорость движения
            size: this.getAnimalSize(type)
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
        
        // Определяем количество в зависимости от типа
        let amount = 1;
        if (type === 'berries') amount = 10;
        else if (['meat', 'bird', 'fish', 'cooked_food'].includes(type)) amount = 1;
        else if (type === 'money') amount = 10 + Math.floor(Math.random() * 50);
        else if (type === 'wood') amount = 5;
        
        this.resources.push({
            type: type,
            x: x,
            y: y,
            amount: amount
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
            // Ночь - темно-синий фон
            this.ctx.fillStyle = '#0a0a1a';
        } else if (this.weather === 'rain') {
            // Дождь - темно-зеленый
            this.ctx.fillStyle = '#1a3a1a';
        } else {
            // День - реалистичный зеленый цвет травы
            const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, '#5a8a4a'); // Светлее сверху
            gradient.addColorStop(1, '#2a5a2a'); // Темнее снизу
            this.ctx.fillStyle = gradient;
        }
        this.ctx.fillRect(0, 0, width, height);
        
        // Текстура травы (маленькие точки)
        if (this.weather !== 'night' && this.timeOfDay !== 'night') {
            this.ctx.fillStyle = 'rgba(100, 150, 80, 0.3)';
            for (let i = 0; i < 200; i++) {
                const grassX = Math.random() * width;
                const grassY = Math.random() * height;
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

        // Отрисовка агентов (если есть)
        if (window.agents) {
            const allAgents = window.agents.getAllAgents();
            allAgents.forEach(agent => {
                this.drawAgent(agent);
            });
        }
    }

    drawAnimal(animal) {
        if (!this.ctx) return;
        
        const x = animal.x;
        const y = animal.y;
        const size = animal.size;
        
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
                this.ctx.ellipse(x, y, size * 0.6, size * 0.4, 0, 0, Math.PI * 2);
                this.ctx.fill();
                // Голова
                this.ctx.beginPath();
                this.ctx.ellipse(x - size * 0.4, y, size * 0.3, size * 0.25, 0, 0, Math.PI * 2);
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
                this.ctx.ellipse(x, y, size * 0.5, size * 0.35, 0, 0, Math.PI * 2);
                this.ctx.fill();
                // Голова
                this.ctx.beginPath();
                this.ctx.ellipse(x - size * 0.35, y, size * 0.25, size * 0.2, 0, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            case 'sheep':
                // Овца
                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.ctx.ellipse(x, y, size * 0.55, size * 0.4, 0, 0, Math.PI * 2);
                this.ctx.fill();
                // Голова
                this.ctx.fillStyle = '#f0f0f0';
                this.ctx.beginPath();
                this.ctx.ellipse(x - size * 0.4, y, size * 0.25, size * 0.2, 0, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            case 'rooster':
            case 'chicken':
                // Петух/Курица
                this.ctx.fillStyle = animal.type === 'rooster' ? '#ff6600' : '#ffaa00';
                this.ctx.beginPath();
                this.ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
                this.ctx.fill();
                // Голова
                this.ctx.fillStyle = '#ff8800';
                this.ctx.beginPath();
                this.ctx.arc(x - size * 0.3, y, size * 0.25, 0, Math.PI * 2);
                this.ctx.fill();
                // Гребешок (для петуха)
                if (animal.type === 'rooster') {
                    this.ctx.fillStyle = '#ff0000';
                    this.ctx.beginPath();
                    this.ctx.moveTo(x - size * 0.35, y - size * 0.2);
                    this.ctx.lineTo(x - size * 0.25, y - size * 0.35);
                    this.ctx.lineTo(x - size * 0.15, y - size * 0.2);
                    this.ctx.closePath();
                    this.ctx.fill();
                }
                break;
            case 'cat':
                // Кошка
                this.ctx.fillStyle = '#8a6a4a';
                this.ctx.beginPath();
                this.ctx.ellipse(x, y, size * 0.4, size * 0.3, 0, 0, Math.PI * 2);
                this.ctx.fill();
                // Голова
                this.ctx.beginPath();
                this.ctx.arc(x - size * 0.3, y, size * 0.25, 0, Math.PI * 2);
                this.ctx.fill();
                // Уши
                this.ctx.beginPath();
                this.ctx.moveTo(x - size * 0.4, y - size * 0.15);
                this.ctx.lineTo(x - size * 0.35, y - size * 0.3);
                this.ctx.lineTo(x - size * 0.3, y - size * 0.15);
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
        
        // Тень человека
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(x + 2, y + 18, 6, 3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Определение позы в зависимости от состояния
        let armAngle = 0;
        let legAngle = 0;
        if (state === 'rest') {
            // Сидит или стоит спокойно
            armAngle = 0.2;
            legAngle = 0;
        } else if (state === 'findFood') {
            // Быстро идет
            armAngle = 0.5;
            legAngle = 0.3;
        } else {
            // Идет нормально
            armAngle = 0.3;
            legAngle = 0.2;
        }
        
        // Ноги (штаны)
        this.ctx.fillStyle = style.pants;
        // Левая нога
        this.ctx.fillRect(x - 3, y + 8, 3, 8);
        // Правая нога
        this.ctx.fillRect(x, y + 8, 3, 8);
        
        // Ноги (обувь)
        this.ctx.fillStyle = '#2a1a1a';
        this.ctx.fillRect(x - 4, y + 15, 2, 2);
        this.ctx.fillRect(x + 2, y + 15, 2, 2);
        
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
        
        // Голова
        this.ctx.fillStyle = style.skin;
        this.ctx.beginPath();
        this.ctx.arc(x, y - 8, 5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Волосы
        this.ctx.fillStyle = style.hair;
        this.ctx.beginPath();
        this.ctx.arc(x, y - 9, 5, 0, Math.PI * 2);
        this.ctx.fill();
        // Верхняя часть волос
        this.ctx.fillRect(x - 5, y - 12, 10, 3);
        
        // Лицо (глаза)
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(x - 2, y - 9, 1, 0, Math.PI * 2);
        this.ctx.arc(x + 2, y - 9, 1, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(x - 2, y - 9, 0.5, 0, Math.PI * 2);
        this.ctx.arc(x + 2, y - 9, 0.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Рот (простая линия)
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 0.5;
        this.ctx.beginPath();
        this.ctx.arc(x, y - 7, 1, 0, Math.PI);
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
        
        if (window.agents) {
            window.agents.update();
            window.agents.updateAllAgentsUI();
        }
    }
}

// Глобальный экземпляр мира будет создан в main.js после загрузки DOM
