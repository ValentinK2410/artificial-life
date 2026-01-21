// Модуль для работы с миром и canvas

class World {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.day = 1;
        this.timeOfDay = 'day'; // day, night
        this.weather = 'sunny'; // sunny, rain, night
        this.isRunning = false;
        this.simulationSpeed = 5;
        this.animationFrameId = null;
        this.resources = [];
    }

    initializeCanvas(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.draw();
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

    addResource(type) {
        // Добавление ресурса на случайную позицию
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

        // Очистка canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Фон в зависимости от времени суток и погоды
        if (this.weather === 'night' || this.timeOfDay === 'night') {
            this.ctx.fillStyle = '#1a1a2e';
        } else if (this.weather === 'rain') {
            this.ctx.fillStyle = '#2a2a3a';
        } else {
            this.ctx.fillStyle = '#3a4a3a';
        }
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Отрисовка ресурсов
        this.resources.forEach(resource => {
            if (resource.type === 'berries') {
                // Ягоды - красные круги
                this.ctx.fillStyle = '#ff4444';
                this.ctx.beginPath();
                this.ctx.arc(resource.x, resource.y, 8, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (resource.type === 'wood') {
                // Дрова - коричневые прямоугольники
                this.ctx.fillStyle = '#8b4513';
                this.ctx.fillRect(resource.x - 10, resource.y - 5, 20, 10);
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

        // Простая отрисовка агента как круга
        const colors = {
            'man': '#4a9eff',
            'woman': '#ff4a9e',
            'boy': '#9eff4a',
            'girl': '#ff9e4a',
            'oldman': '#9e4aff',
            'oldwoman': '#ff4aff'
        };

        this.ctx.fillStyle = colors[agent.type] || '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(agent.x || 100, agent.y || 100, 12, 0, Math.PI * 2);
        this.ctx.fill();

        // Обводка в зависимости от состояния
        this.ctx.strokeStyle = agent.state === 'healthy' ? '#00ff00' : 
                               agent.state === 'wounded' ? '#ffaa00' : '#ff0000';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
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

// Создание глобального экземпляра мира
const world = new World();
window.world = world;
