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
            this.frameCount = 0; // Сброс счетчика кадров
            this.gameLoop();
            if (window.addLogEntry) {
                window.addLogEntry('▶️ Симуляция запущена - агенты начали движение');
            }
        }
    }

    pause() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        // Финальная отрисовка после паузы
        if (this.world) {
            this.world.draw();
        }
        if (window.addLogEntry) {
            window.addLogEntry('⏸️ Симуляция приостановлена');
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

    weatherSelect.addEventListener('change', (e) => {
        const weather = e.target.value;
        console.log('Погода изменена на:', weather);
        if (window.world) {
            world.setWeather(weather);
        }
        addLogEntry(`Погода изменена: ${getWeatherName(weather)}`);
    });

    // Инструменты
    document.getElementById('addSawBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('saw');
        addLogEntry('Пила добавлена на карту');
    });
    document.getElementById('addAxeBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('axe');
        addLogEntry('Топор добавлен на карту');
    });
    document.getElementById('addHammerBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('hammer');
        addLogEntry('Молоток добавлен на карту');
    });
    document.getElementById('addPickaxeBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('pickaxe');
        addLogEntry('Кирка добавлена на карту');
    });
    document.getElementById('addShovelBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('shovel');
        addLogEntry('Лопата добавлена на карту');
    });
    document.getElementById('addFishingRodBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('fishing_rod');
        addLogEntry('Удочка добавлена на карту');
    });

    // Одежда
    document.getElementById('addSummerClothesManBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('summer_clothes_man');
        addLogEntry('Мужская летняя одежда добавлена на карту');
    });
    document.getElementById('addSummerClothesWomanBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('summer_clothes_woman');
        addLogEntry('Женская летняя одежда добавлена на карту');
    });
    document.getElementById('addWinterClothesManBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('winter_clothes_man');
        addLogEntry('Мужская зимняя одежда добавлена на карту');
    });
    document.getElementById('addWinterClothesWomanBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('winter_clothes_woman');
        addLogEntry('Женская зимняя одежда добавлена на карту');
    });

    // Ресурсы
    document.getElementById('addBerriesBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('berries');
        addLogEntry('Ягоды добавлены на карту');
    });
    document.getElementById('addWoodBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('wood');
        addLogEntry('Дрова добавлены на карту');
    });
    document.getElementById('addMoneyBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('money');
        addLogEntry('Деньги добавлены на карту');
    });
    document.getElementById('addCookedFoodBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('cooked_food');
        addLogEntry('Готовая еда добавлена на карту');
    });
    document.getElementById('addMeatBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('meat');
        addLogEntry('Мясо добавлено на карту');
    });
    document.getElementById('addBirdBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('bird');
        addLogEntry('Птица добавлена на карту');
    });
    document.getElementById('addFishBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('fish');
        addLogEntry('Рыба добавлена на карту');
    });

    // Животные
    document.getElementById('addCowBtn')?.addEventListener('click', () => {
        if (window.world) world.addAnimal('cow');
        addLogEntry('Корова добавлена на карту');
    });
    document.getElementById('addGoatBtn')?.addEventListener('click', () => {
        if (window.world) world.addAnimal('goat');
        addLogEntry('Коза добавлена на карту');
    });
    document.getElementById('addSheepBtn')?.addEventListener('click', () => {
        if (window.world) world.addAnimal('sheep');
        addLogEntry('Овца добавлена на карту');
    });
    document.getElementById('addRoosterBtn')?.addEventListener('click', () => {
        if (window.world) world.addAnimal('rooster');
        addLogEntry('Петух добавлен на карту');
    });
    document.getElementById('addChickenBtn')?.addEventListener('click', () => {
        if (window.world) world.addAnimal('chicken');
        addLogEntry('Курица добавлена на карту');
    });
    document.getElementById('addCatBtn')?.addEventListener('click', () => {
        if (window.world) world.addAnimal('cat');
        addLogEntry('Кошка добавлена на карту');
    });
    document.getElementById('addBullBtn')?.addEventListener('click', () => {
        if (window.world) world.addAnimal('bull');
        addLogEntry('Бык добавлен на карту');
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
            
            // Инициализация позиций агентов после создания мира
            if (window.agents) {
                window.agents.getAllAgents().forEach(agent => {
                    agent.initializePosition();
                });
            }
            
            // Первоначальная отрисовка статичной сцены
            window.world.draw();
        }
    }
}

// Инициализация симуляции
function initializeSimulation() {
    // Убеждаемся, что мир и агенты созданы
    if (!window.world || !window.agents) {
        console.warn('Мир или агенты не готовы, повторная попытка через 100мс...');
        setTimeout(initializeSimulation, 100);
        return;
    }
    
    // Создание экземпляра Simulation
    simulation = new Simulation(window.world, window.agents);
    window.simulation = simulation;
    
    // Первоначальная отрисовка статичной сцены (мир + агенты)
    if (window.world) {
        window.world.draw();
    }
    
    // Обновление UI
    if (simulation) {
        simulation.updateSidebar();
    }
    
        addLogEntry('✅ Симуляция инициализирована. Нажмите "Старт" для начала.');
        addLogEntry(`📊 Агентов на карте: ${simulation.agents.length}`);
        console.log('Симуляция готова. Агенты:', simulation.agents.length);
        console.log('Мир создан, агенты размещены. Статичная сцена отображена.');
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
