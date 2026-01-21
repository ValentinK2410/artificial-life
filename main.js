// Основной файл для управления интерфейсом и симуляцией

// Класс Simulation для управления всей симуляцией
class Simulation {
    constructor(world, agentsManager) {
        this.world = world;
        this.agentsManager = agentsManager;
        this.agents = agentsManager.getAllAgents();
        this.isRunning = false;
        this.animationFrameId = null;
        this.simulationSpeed = 5; // Скорость симуляции (1-10)
        this.frameCount = 0;
        
        // Инициализация агентов с разными стартовыми координатами
        this.initializeAgentsPositions();
    }

    initializeAgentsPositions() {
        if (!this.world || !this.world.canvas) return;
        
        const width = this.world.canvas.width;
        const height = this.world.canvas.height;
        
        // Распределяем агентов по разным точкам карты
        const positions = [
            { x: width * 0.2, y: height * 0.2 },   // Мужчина
            { x: width * 0.3, y: height * 0.3 },   // Женщина
            { x: width * 0.7, y: height * 0.2 },    // Парень
            { x: width * 0.8, y: height * 0.3 },   // Девушка
            { x: width * 0.2, y: height * 0.7 },   // Старик
            { x: width * 0.3, y: height * 0.8 }    // Старуха
        ];
        
        this.agents.forEach((agent, index) => {
            if (positions[index]) {
                agent.position.x = positions[index].x;
                agent.position.y = positions[index].y;
            } else {
                agent.initializePosition();
            }
        });
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.gameLoop();
            if (window.addLogEntry) {
                window.addLogEntry('Симуляция запущена');
            }
        }
    }

    pause() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        if (window.addLogEntry) {
            window.addLogEntry('Симуляция приостановлена');
        }
    }

    reset() {
        this.pause();
        this.frameCount = 0;
        
        // Сброс мира
        if (this.world) {
            this.world.reset();
        }
        
        // Сброс агентов
        if (this.agentsManager) {
            this.agentsManager.reset();
            this.agents = this.agentsManager.getAllAgents();
            this.initializeAgentsPositions();
        }
        
        // Перерисовка
        if (this.world) {
            this.world.draw();
        }
        
        // Обновление UI
        this.updateSidebar();
        
        if (window.addLogEntry) {
            window.addLogEntry('Симуляция сброшена');
        }
    }

    setSimulationSpeed(speed) {
        this.simulationSpeed = speed;
    }

    gameLoop() {
        if (!this.isRunning) return;

        // Пропускаем кадры в зависимости от скорости симуляции
        this.frameCount++;
        const framesToSkip = 11 - this.simulationSpeed; // Чем выше скорость, тем меньше пропускаем
        
        if (this.frameCount % Math.max(1, framesToSkip) === 0 || this.simulationSpeed >= 10) {
            // Обновление агентов
            this.agents.forEach(agent => {
                agent.update();
                if (this.world) {
                    agent.interactWithWorld(this.world);
                }
            });
        }

        // Отрисовка мира (включая агентов)
        if (this.world) {
            this.world.draw();
        }

        // Обновление панели управления
        this.updateSidebar();

        // Запрос следующего кадра
        this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }

    updateSidebar() {
        // Обновление данных всех агентов во вкладке "Агенты"
        this.agents.forEach(agent => {
            this.updateAgentUI(agent);
        });
        
        // Обновление статистики мира
        if (this.world) {
            this.updateWorldStats();
        }
    }

    updateAgentUI(agent) {
        const agentItem = document.querySelector(`[data-agent="${agent.type}"]`)?.closest('.agent-item');
        if (!agentItem) return;

        const nameSpan = agentItem.querySelector('.agent-name');
        const ageSpan = agentItem.querySelector('.agent-age');
        const stateSelect = agentItem.querySelector('.agent-state');
        const psycheSelect = agentItem.querySelector('.agent-psyche');
        const energySlider = agentItem.querySelector('.agent-energy');
        const energyValue = agentItem.querySelector('.energy-value');
        const hungerSlider = agentItem.querySelector('.agent-hunger');
        const hungerValue = agentItem.querySelector('.hunger-value');
        const statusSpan = agentItem.querySelector('.agent-status');

        if (nameSpan) nameSpan.textContent = agent.name;
        if (ageSpan) ageSpan.textContent = agent.age;
        
        // Обновление состояния на основе здоровья
        if (stateSelect) {
            const healthState = agent.health > 70 ? 'healthy' : 
                              agent.health > 40 ? 'wounded' : 'sick';
            stateSelect.value = healthState;
        }
        
        // Обновление психики на основе настроения
        if (psycheSelect) {
            const psycheState = agent.mood === 'neutral' ? 'calm' :
                               agent.mood === 'anxious' ? 'tense' : 'panic';
            psycheSelect.value = psycheState;
        }
        
        // Обновление энергии
        if (energySlider) {
            const energy = Math.floor(agent.energy);
            energySlider.value = energy;
            if (energyValue) energyValue.textContent = energy;
        }
        
        // Обновление голода
        if (hungerSlider) {
            const hunger = Math.floor(agent.hunger);
            hungerSlider.value = hunger;
            if (hungerValue) hungerValue.textContent = hunger;
        }
        
        // Обновление статуса
        if (statusSpan) {
            statusSpan.textContent = agent.getStateName();
        }
    }

    updateWorldStats() {
        const dayValue = document.getElementById('dayValue');
        const timeOfDayValue = document.getElementById('timeOfDayValue');
        const weatherSelect = document.getElementById('weatherSelect');

        if (dayValue && this.world) {
            dayValue.textContent = this.world.day;
        }
        if (timeOfDayValue && this.world) {
            timeOfDayValue.textContent = this.world.timeOfDay === 'day' ? 'День' : 'Ночь';
        }
        if (weatherSelect && this.world) {
            weatherSelect.value = this.world.weather;
        }
    }
}

// Глобальная переменная для симуляции
let simulation = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    initializeSimulationControls();
    initializeAgentAccordion();
    initializeWorldControls();
    initializeCanvas();
    initializeSimulation();
});

// Управление вкладками
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // Убираем активный класс со всех кнопок и панелей
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));

            // Добавляем активный класс к выбранной кнопке и панели
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });
}

// Управление контролами симуляции
function initializeSimulationControls() {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');

    // Обновление значения скорости
    speedSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        speedValue.textContent = value;
        if (simulation) {
            simulation.setSimulationSpeed(parseInt(value));
        }
    });

    // Кнопки управления - привязка к Simulation
    startBtn.addEventListener('click', () => {
        if (simulation) {
            simulation.start();
        }
    });

    pauseBtn.addEventListener('click', () => {
        if (simulation) {
            simulation.pause();
        }
    });

    resetBtn.addEventListener('click', () => {
        if (simulation) {
            simulation.reset();
        }
    });
}

// Управление аккордеоном агентов
function initializeAgentAccordion() {
    const agentHeaders = document.querySelectorAll('.agent-header');

    agentHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const agentItem = header.closest('.agent-item');
            const isActive = agentItem.classList.contains('active');

            // Закрываем все аккордеоны
            document.querySelectorAll('.agent-item').forEach(item => {
                item.classList.remove('active');
            });

            // Открываем выбранный, если он был закрыт
            if (!isActive) {
                agentItem.classList.add('active');
            }
        });
    });

    // Обновление значений ползунков энергии и голода
    document.querySelectorAll('.agent-energy, .agent-hunger').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const value = e.target.value;
            const valueSpan = e.target.parentElement.querySelector('.energy-value, .hunger-value');
            if (valueSpan) {
                valueSpan.textContent = value;
            }
        });
    });
}

// Управление контролами мира
function initializeWorldControls() {
    const weatherSelect = document.getElementById('weatherSelect');
    const addBerriesBtn = document.getElementById('addBerriesBtn');
    const addWoodBtn = document.getElementById('addWoodBtn');

    weatherSelect.addEventListener('change', (e) => {
        const weather = e.target.value;
        console.log('Погода изменена на:', weather);
        if (window.world) {
            world.setWeather(weather);
        }
        addLogEntry(`Погода изменена: ${getWeatherName(weather)}`);
    });

    addBerriesBtn.addEventListener('click', () => {
        console.log('Добавлены ягоды');
        if (window.world) {
            world.addResource('berries');
        }
        addLogEntry('Ягоды добавлены на карту');
    });

    addWoodBtn.addEventListener('click', () => {
        console.log('Добавлены дрова');
        if (window.world) {
            world.addResource('wood');
        }
        addLogEntry('Дрова добавлены на карту');
    });
}

// Получение названия погоды
function getWeatherName(weather) {
    const names = {
        'sunny': 'Солнечно',
        'rain': 'Дождь',
        'night': 'Ночь'
    };
    return names[weather] || weather;
}

// Инициализация canvas и мира
function initializeCanvas() {
    const canvas = document.getElementById('worldCanvas');
    if (canvas) {
        // Устанавливаем размер canvas на весь контейнер
        const resizeCanvas = () => {
            const container = canvas.parentElement;
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            
            // Перегенерируем мир при изменении размера
            if (window.world) {
                window.world.generateTerrain();
                if (simulation) {
                    simulation.initializeAgentsPositions();
                }
                window.world.draw();
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Создание и инициализация мира
        if (!window.world) {
            window.world = new World(canvas);
            window.world.generateTerrain();
            window.world.draw();
        }
    }
}

// Инициализация симуляции
function initializeSimulation() {
    if (window.world && window.agents) {
        simulation = new Simulation(window.world, window.agents);
        window.simulation = simulation;
        
        // Первоначальная отрисовка
        if (window.world) {
            window.world.draw();
        }
        
        // Обновление UI
        if (simulation) {
            simulation.updateSidebar();
        }
        
        addLogEntry('Симуляция инициализирована');
    }
}

// Функция для добавления записей в лог
function addLogEntry(message) {
    const logContainer = document.getElementById('log');
    if (logContainer) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        
        const time = new Date().toLocaleTimeString('ru-RU');
        entry.innerHTML = `<span class="log-time">[${time}]</span><span class="log-message">${message}</span>`;
        
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }
}

// Экспорт функций для использования в других модулях
window.addLogEntry = addLogEntry;
