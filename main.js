// Основной файл для управления интерфейсом и симуляцией

// Класс Simulation для управления всей симуляцией
class Simulation {
    constructor(world, agentsManager) {
        this.world = world;
        this.agentsManager = agentsManager;
        this.agents = agentsManager.getAllAgents();
        this.isRunning = false;
        this.animationFrameId = null;
        this.simulationSpeed = 20; // Скорость симуляции (1-50)
        this.frameCount = 0;
        this.selectedAgent = null; // Выбранный агент для управления
        
        // Инициализация агентов с разными стартовыми координатами
        this.initializeAgentsPositions();
        
        // Настройка обработки кликов для управления агентами
        this.setupAgentControl();
    }
    
    setupAgentControl() {
        if (!this.world || !this.world.canvas) return;
        
        const getWorldCoords = (e) => {
            const rect = this.world.canvas.getBoundingClientRect();
            return {
                x: (e.clientX - rect.left) / this.world.camera.scale + this.world.camera.x,
                y: (e.clientY - rect.top) / this.world.camera.scale + this.world.camera.y
            };
        };
        
        // Обработка одинарного клика - только для установки цели
        this.world.canvas.addEventListener('click', (e) => {
            if (e.button !== 0 && e.detail !== 1) return; // Только левая кнопка, одинарный клик
            
            const worldCoords = getWorldCoords(e);
            
            // Проверяем, кликнули ли на агента
            const playerAgents = this.agentsManager.getPlayerAgents();
            let clickedAgent = null;
            
            for (let agent of playerAgents) {
                const dx = agent.position.x - worldCoords.x;
                const dy = agent.position.y - worldCoords.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 25) { // Радиус клика
                    clickedAgent = agent;
                    break;
                }
            }
            
            // Если кликнули на агента - только выбираем, панель не показываем
            if (clickedAgent) {
                this.selectedAgent = clickedAgent;
                if (window.addLogEntry) {
                    window.addLogEntry(`👤 Выбран агент: ${clickedAgent.name} (двойной клик для управления)`);
                }
                this.world.draw(); // Перерисовка для выделения
            } else if (this.selectedAgent) {
                // Если есть выбранный агент, устанавливаем цель
                this.selectedAgent.setTarget(worldCoords.x, worldCoords.y);
                if (window.addLogEntry) {
                    window.addLogEntry(`📍 ${this.selectedAgent.name} направляется к (${Math.floor(worldCoords.x)}, ${Math.floor(worldCoords.y)})`);
                }
                
                // Синхронизация с сервером
                if (window.networkManager && window.networkManager.isConnected) {
                    window.networkManager.updateAgent({
                        id: this.selectedAgent.id,
                        position: this.selectedAgent.position,
                        targetPosition: this.selectedAgent.targetPosition,
                        isPlayerControlled: true
                    });
                }
            }
        });
        
        // Обработка двойного клика - показываем панель управления
        this.world.canvas.addEventListener('dblclick', (e) => {
            if (e.button !== 0) return; // Только левая кнопка
            
            const worldCoords = getWorldCoords(e);
            
            // Проверяем, кликнули ли на агента
            const playerAgents = this.agentsManager.getPlayerAgents();
            let clickedAgent = null;
            
            for (let agent of playerAgents) {
                const dx = agent.position.x - worldCoords.x;
                const dy = agent.position.y - worldCoords.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 25) { // Радиус клика
                    clickedAgent = agent;
                    break;
                }
            }
            
            if (clickedAgent) {
                // Выбираем агента и показываем панель управления
                this.selectedAgent = clickedAgent;
                this.showAgentControlPanel(clickedAgent);
                if (window.addLogEntry) {
                    window.addLogEntry(`👤 Открыта панель управления: ${clickedAgent.name}`);
                }
                this.world.draw(); // Перерисовка для выделения
            }
        });
    }
    
    // Метод handleCanvasClick больше не используется, логика перенесена в setupAgentControl
    // Оставлен для обратной совместимости
    handleCanvasClick(x, y) {
        // Логика перенесена в обработчики click и dblclick
    }
    
    // Показать панель управления агентом
    showAgentControlPanel(agent) {
        // Сохраняем ссылку на текущего агента
        this.selectedAgent = agent;
        
        // Создаем или обновляем панель управления
        let panel = document.getElementById('agentControlPanel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'agentControlPanel';
            panel.className = 'agent-control-panel';
            document.body.appendChild(panel);
        }
        
        // Названия навыков
        const skillNames = {
            'saw': 'Пила',
            'axe': 'Топор',
            'hammer': 'Молоток',
            'pickaxe': 'Кирка',
            'shovel': 'Лопата',
            'fishing': 'Рыбалка',
            'cooking': 'Готовка',
            'building': 'Строительство',
            'farming': 'Фермерство',
            'hunting': 'Охота'
        };
        
        // Иконки навыков
        const skillIcons = {
            'saw': '🪚',
            'axe': '🪓',
            'hammer': '🔨',
            'pickaxe': '⛏️',
            'shovel': '🪚',
            'fishing': '🎣',
            'cooking': '🍳',
            'building': '🏗️',
            'farming': '🌾',
            'hunting': '🎯'
        };
        
        // Генерируем HTML для навыков
        let skillsHTML = '';
        if (agent.experience) {
            Object.keys(agent.experience).forEach(skill => {
                const exp = Math.floor(agent.experience[skill] || 0);
                const level = Math.floor(exp / 10); // Уровень (0-10)
                const percentage = exp % 10; // Процент до следующего уровня
                
                skillsHTML += `
                    <div class="skill-item">
                        <div class="skill-icon">${skillIcons[skill] || '📚'}</div>
                        <div class="skill-info">
                            <div class="skill-name">${skillNames[skill] || skill}</div>
                            <div class="skill-level">Уровень ${level}</div>
                            <div class="skill-progress">
                                <div class="skill-progress-bar" style="width: ${percentage * 10}%"></div>
                            </div>
                            <div class="skill-exp">${exp}/100 опыта</div>
                        </div>
                    </div>
                `;
            });
        }
        
        panel.innerHTML = `
            <div class="agent-control-header">
                <h3>Управление: ${agent.name}</h3>
                <button class="close-btn" onclick="window.simulation.hideAgentControlPanel()">×</button>
            </div>
            <div class="agent-control-tabs">
                <button class="agent-tab-btn active" data-tab="info">Информация</button>
                <button class="agent-tab-btn" data-tab="skills">Навыки</button>
                <button class="agent-tab-btn" data-tab="commands">Команды</button>
            </div>
            <div class="agent-control-content">
                <!-- Вкладка: Информация -->
                <div class="agent-tab-panel active" data-panel="info">
                    <div class="agent-info">
                        <p><strong>Здоровье:</strong> ${Math.floor(agent.health)}%</p>
                        <p><strong>Энергия:</strong> ${Math.floor(agent.energy)}%</p>
                        <p><strong>Голод:</strong> ${Math.floor(agent.hunger)}%</p>
                        <p><strong>Температура:</strong> ${Math.floor(agent.temperature || 37)}°C</p>
                        <p><strong>Деньги:</strong> ${this.getPlayerMoney()} монет</p>
                        <p><strong>Возраст:</strong> ${agent.age} лет</p>
                        <p><strong>Состояние:</strong> ${this.getStateName(agent.state)}</p>
                    </div>
                </div>
                
                <!-- Вкладка: Навыки -->
                <div class="agent-tab-panel" data-panel="skills">
                    <div class="skills-container">
                        ${skillsHTML || '<p style="color: #888; text-align: center; padding: 20px;">Навыки еще не изучены</p>'}
                    </div>
                </div>
                
                <!-- Вкладка: Команды -->
                <div class="agent-tab-panel" data-panel="commands">
                    <div class="agent-commands">
                        <button class="command-btn" onclick="window.simulation.giveCommand('teachSkill')">
                            📚 Обучить навыку (10 монет)
                        </button>
                        <button class="command-btn" onclick="window.simulation.giveCommand('cook')">
                            🍳 Готовить еду
                        </button>
                        <button class="command-btn" onclick="window.simulation.giveCommand('buildFire')">
                            🔥 Разжечь костер
                        </button>
                        <button class="command-btn" onclick="window.simulation.giveCommand('hunt')">
                            🎯 Охотиться
                        </button>
                        <button class="command-btn" onclick="window.simulation.giveCommand('build')">
                            🏗️ Строить
                        </button>
                        <button class="command-btn" onclick="window.simulation.giveCommand('gather')">
                            🌿 Собирать ресурсы
                        </button>
                        <button class="command-btn" onclick="window.simulation.giveCommand('fish')">
                            🎣 Рыбачить
                        </button>
                        <button class="command-btn" onclick="window.simulation.giveCommand('farm')">
                            🌾 Фермерство
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Обработчики вкладок
        const tabButtons = panel.querySelectorAll('.agent-tab-btn');
        const tabPanels = panel.querySelectorAll('.agent-tab-panel');
        
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                
                // Убираем активный класс со всех кнопок и панелей
                tabButtons.forEach(b => b.classList.remove('active'));
                tabPanels.forEach(p => p.classList.remove('active'));
                
                // Добавляем активный класс к выбранной кнопке и панели
                btn.classList.add('active');
                panel.querySelector(`[data-panel="${tabName}"]`).classList.add('active');
            });
        });
        
        panel.style.display = 'block';
    }
    
    // Получить название состояния
    getStateName(state) {
        const stateNames = {
            'explore': 'Исследует',
            'findFood': 'Ищет еду',
            'rest': 'Отдыхает',
            'findHeat': 'Ищет тепло',
            'buildFire': 'Разводит костер',
            'defend': 'Обороняется',
            'feedAnimal': 'Кормит животных',
            'playWithPet': 'Играет с питомцем',
            'storeFood': 'Запасает еду',
            'moveToPoint': 'Двигается к цели',
            'cook': 'Готовит',
            'hunt': 'Охотится',
            'build': 'Строит',
            'fish': 'Рыбачит',
            'farm': 'Занимается фермерством'
        };
        return stateNames[state] || state;
    }
    
    // Скрыть панель управления
    hideAgentControlPanel() {
        const panel = document.getElementById('agentControlPanel');
        if (panel) {
            panel.style.display = 'none';
        }
    }
    
    // Получить деньги игрока
    getPlayerMoney() {
        // Суммируем деньги из инвентаря всех агентов игрока
        const playerAgents = this.agentsManager.getPlayerAgents();
        let totalMoney = 0;
        playerAgents.forEach(agent => {
            const moneyItems = agent.inventory.filter(item => item.type === 'money');
            moneyItems.forEach(item => {
                totalMoney += item.amount || 0;
            });
        });
        return totalMoney;
    }
    
    // Выдать команду агенту
    giveCommand(command) {
        if (!this.selectedAgent) return;
        
        switch(command) {
            case 'teachSkill':
                this.teachSkill();
                break;
            case 'cook':
                this.selectedAgent.state = 'cook';
                if (window.addLogEntry) {
                    window.addLogEntry(`🍳 ${this.selectedAgent.name} начинает готовить еду`);
                }
                break;
            case 'buildFire':
                this.selectedAgent.state = 'buildFire';
                if (window.addLogEntry) {
                    window.addLogEntry(`🔥 ${this.selectedAgent.name} разжигает костер`);
                }
                break;
            case 'hunt':
                this.selectedAgent.state = 'hunt';
                if (window.addLogEntry) {
                    window.addLogEntry(`🎯 ${this.selectedAgent.name} идет на охоту`);
                }
                break;
            case 'build':
                this.selectedAgent.state = 'build';
                if (window.addLogEntry) {
                    window.addLogEntry(`🏗️ ${this.selectedAgent.name} начинает строить`);
                }
                break;
            case 'gather':
                this.selectedAgent.state = 'findFood';
                if (window.addLogEntry) {
                    window.addLogEntry(`🌿 ${this.selectedAgent.name} собирает ресурсы`);
                }
                break;
            case 'fish':
                this.selectedAgent.state = 'fish';
                if (window.addLogEntry) {
                    window.addLogEntry(`🎣 ${this.selectedAgent.name} идет рыбачить`);
                }
                break;
            case 'farm':
                this.selectedAgent.state = 'farm';
                if (window.addLogEntry) {
                    window.addLogEntry(`🌾 ${this.selectedAgent.name} занимается фермерством`);
                }
                break;
        }
        
        this.hideAgentControlPanel();
    }
    
    // Обучение навыку
    teachSkill() {
        if (!this.selectedAgent) return;
        
        const cost = 10;
        const playerMoney = this.getPlayerMoney();
        
        if (playerMoney < cost) {
            if (window.addLogEntry) {
                window.addLogEntry(`❌ Недостаточно денег! Нужно ${cost} монет, у вас ${playerMoney}`);
            }
            return;
        }
        
        // Списываем деньги
        this.spendMoney(cost);
        
        // Выбираем случайный навык для обучения
        const skills = Object.keys(this.selectedAgent.experience);
        const randomSkill = skills[Math.floor(Math.random() * skills.length)];
        const experienceGain = 5 + Math.floor(Math.random() * 10);
        
        this.selectedAgent.gainExperience(randomSkill, experienceGain);
        
        if (window.addLogEntry) {
            const skillNames = {
                'saw': 'работа с пилой',
                'axe': 'работа с топором',
                'hammer': 'работа с молотком',
                'pickaxe': 'работа с киркой',
                'shovel': 'работа с лопатой',
                'fishing': 'рыбалка',
                'cooking': 'готовка',
                'building': 'строительство',
                'farming': 'фермерство',
                'hunting': 'охота'
            };
            window.addLogEntry(`📚 ${this.selectedAgent.name} обучился навыку "${skillNames[randomSkill] || randomSkill}" (+${experienceGain} опыта)`);
        }
    }
    
    // Потратить деньги
    spendMoney(amount) {
        const playerAgents = this.agentsManager.getPlayerAgents();
        let remaining = amount;
        
        for (let agent of playerAgents) {
            if (remaining <= 0) break;
            
            for (let i = agent.inventory.length - 1; i >= 0; i--) {
                if (remaining <= 0) break;
                const item = agent.inventory[i];
                if (item.type === 'money') {
                    const itemAmount = item.amount || 0;
                    if (itemAmount <= remaining) {
                        remaining -= itemAmount;
                        agent.inventory.splice(i, 1);
                    } else {
                        item.amount -= remaining;
                        remaining = 0;
                    }
                }
            }
        }
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

        // Вычисляем количество обновлений за кадр в зависимости от скорости
        // Скорость 1 = 1 обновление за 50 кадров (медленно)
        // Скорость 25 = 1 обновление за 2 кадра (средне)
        // Скорость 50 = несколько обновлений за кадр (быстро)
        const updatesPerFrame = Math.max(1, Math.floor(this.simulationSpeed / 10));
        const frameSkip = Math.max(1, Math.floor(51 / this.simulationSpeed));
        
        this.frameCount++;
        
        // Обновляем агентов несколько раз за кадр при высокой скорости
        if (this.frameCount % frameSkip === 0) {
            for (let i = 0; i < updatesPerFrame; i++) {
                // Обновление мира (животные, хищники)
                if (this.world) {
                    this.world.update();
                }
                
                // Обновление агентов
                this.agents.forEach(agent => {
                    agent.update();
                    if (this.world) {
                        agent.interactWithWorld(this.world);
                    }
                });
            }
        }

        // Отрисовка мира (включая агентов) - всегда каждый кадр для плавности
        if (this.world) {
            this.world.draw();
        }

        // Обновление панели управления (реже для производительности)
        if (this.frameCount % 5 === 0) {
            this.updateSidebar();
        }

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
    
    // Новые продукты
    document.getElementById('addHoneyBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('honey');
        addLogEntry('Мёд добавлен на карту');
    });
    document.getElementById('addMilkBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('milk');
        addLogEntry('Молоко добавлено на карту');
    });
    document.getElementById('addWaterBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('water');
        addLogEntry('Вода добавлена на карту');
    });
    document.getElementById('addBreadBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('bread');
        addLogEntry('Хлеб добавлен на карту');
    });
    document.getElementById('addKebabBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('kebab');
        addLogEntry('Шашлык добавлен на карту');
    });
    document.getElementById('addPotatoBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('potato');
        addLogEntry('Картофель добавлен на карту');
    });
    document.getElementById('addSaladBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('salad');
        addLogEntry('Салат добавлен на карту');
    });
    document.getElementById('addMushroomsBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('mushrooms');
        addLogEntry('Грибы добавлены на карту');
    });
    document.getElementById('addTeaBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('tea');
        addLogEntry('Чай добавлен на карту');
    });
    document.getElementById('addBananaBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('banana');
        addLogEntry('Банан добавлен на карту');
    });
    document.getElementById('addOrangeBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('orange');
        addLogEntry('Апельсин добавлен на карту');
    });
    document.getElementById('addAppleBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('apple');
        addLogEntry('Яблоко добавлено на карту');
    });
    document.getElementById('addLemonBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('lemon');
        addLogEntry('Лимон добавлен на карту');
    });
    document.getElementById('addRosehipBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('rosehip');
        addLogEntry('Шиповник добавлен на карту');
    });
    document.getElementById('addCabbageBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('cabbage');
        addLogEntry('Капуста добавлена на карту');
    });
    document.getElementById('addSpicesBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('spices');
        addLogEntry('Специи добавлены на карту');
    });
    document.getElementById('addMintBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('mint');
        addLogEntry('Мята добавлена на карту');
    });
    document.getElementById('addStJohnsWortBtn')?.addEventListener('click', () => {
        if (window.world) world.addResource('st_johns_wort');
        addLogEntry('Зверобой добавлен на карту');
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

    // Хищники
    document.getElementById('addWolfBtn')?.addEventListener('click', () => {
        if (window.world) world.addPredator('wolf');
        addLogEntry('Волк добавлен на карту');
    });
    document.getElementById('addBearBtn')?.addEventListener('click', () => {
        if (window.world) world.addPredator('bear');
        addLogEntry('Медведь добавлен на карту');
    });
    document.getElementById('addFoxBtn')?.addEventListener('click', () => {
        if (window.world) world.addPredator('fox');
        addLogEntry('Лиса добавлена на карту');
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

// Загрузка конфигурации продуктов
function loadFoodConfig() {
    // Делаем FOOD_PROPERTIES доступными глобально
    if (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG) {
        window.GAME_CONFIG = GAME_CONFIG;
    }
    // Импортируем FOOD_PROPERTIES если доступны
    if (typeof FOOD_PROPERTIES !== 'undefined' && FOOD_PROPERTIES) {
        window.FOOD_PROPERTIES = FOOD_PROPERTIES;
    }
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
    
    // Проверяем canvas
    if (!window.world.canvas) {
        console.error('Canvas не найден!');
        return;
    }
    
    // Убеждаемся, что canvas имеет размеры
    const canvas = window.world.canvas;
    const container = canvas.parentElement;
    if (container) {
        if (canvas.width === 0 || canvas.height === 0) {
            canvas.width = container.clientWidth || 800;
            canvas.height = container.clientHeight || 600;
            console.log('Canvas размеры установлены:', canvas.width, canvas.height);
        }
    }
    
    // Убеждаемся, что контекст инициализирован
    if (!window.world.ctx) {
        window.world.ctx = canvas.getContext('2d');
        if (!window.world.ctx) {
            console.error('Не удалось получить контекст canvas!');
            return;
        }
        console.log('Canvas context инициализирован');
    }
    
    // Создание экземпляра Simulation
    simulation = new Simulation(window.world, window.agents);
    window.simulation = simulation;
    
    // Первоначальная отрисовка статичной сцены (мир + агенты)
    if (window.world && window.world.ctx) {
        try {
            window.world.draw();
            console.log('Первоначальная отрисовка выполнена');
        } catch (error) {
            console.error('Ошибка при отрисовке:', error);
        }
    } else {
        console.error('Мир или контекст не готовы для отрисовки');
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

// Глобальные переменные для админ-панели
window.isAdmin = false;

// Определяем, продакшен или разработка
const isProduction = window.location.hostname !== 'localhost' && 
                     window.location.hostname !== '127.0.0.1' &&
                     !window.location.hostname.includes('localhost');

// Пароль администратора
// В ПРОДАКШЕНЕ ОБЯЗАТЕЛЬНО ИЗМЕНИТЕ НА СВОЙ СЛОЖНЫЙ ПАРОЛЬ!
window.adminPassword = isProduction 
    ? 'CHANGE_THIS_PASSWORD_IN_PRODUCTION' // ИЗМЕНИТЕ ЭТОТ ПАРОЛЬ!
    : 'admin123'; // Пароль для разработки

// Функции для админ-панели
window.showAdminPanel = function() {
    const panel = document.getElementById('adminPanel');
    if (panel) {
        panel.style.display = 'block';
        panel.classList.add('open');
        loadAdminPlayerList();
    }
};

window.hideAdminPanel = function() {
    const panel = document.getElementById('adminPanel');
    if (panel) {
        panel.classList.remove('open');
        setTimeout(() => {
            panel.style.display = 'none';
        }, 300); // После завершения анимации скрываем
    }
};

function loadAdminPlayerList() {
    // Загружаем список игроков (в реальной версии - с сервера)
    const listContainer = document.getElementById('adminPlayerList');
    if (!listContainer) return;
    
    // Получаем всех агентов всех игроков
    const allAgents = window.agents ? window.agents.getAllAgents() : [];
    const playersMap = new Map();
    
    allAgents.forEach(agent => {
        if (agent.ownerId) {
            if (!playersMap.has(agent.ownerId)) {
                playersMap.set(agent.ownerId, {
                    id: agent.ownerId,
                    agents: [],
                    money: 0
                });
            }
            const player = playersMap.get(agent.ownerId);
            player.agents.push(agent);
            
            // Считаем деньги
            const moneyItems = agent.inventory.filter(item => item.type === 'money');
            moneyItems.forEach(item => {
                player.money += item.amount || 0;
            });
        }
    });
    
    // Отображаем список
    if (playersMap.size === 0) {
        listContainer.innerHTML = '<p style="color: #b0b0b0;">Нет игроков в игре</p>';
        return;
    }
    
    let html = '<ul class="player-list">';
    playersMap.forEach((player, playerId) => {
        html += `
            <li class="player-item">
                <div class="player-item-header">
                    <span class="player-name">Игрок: ${playerId.substring(0, 8)}...</span>
                </div>
                <p style="color: #b0b0b0; font-size: 12px;">Агентов: ${player.agents.length}, Денег: ${player.money}</p>
                <div class="admin-actions">
                    <input type="number" class="admin-input" id="money_${playerId}" placeholder="Деньги" value="${player.money}">
                    <button class="admin-btn" onclick="adminSetMoney('${playerId}')">Начислить деньги</button>
                    <input type="number" class="admin-input" id="health_${playerId}" placeholder="Здоровье" value="100" min="0" max="100">
                    <button class="admin-btn" onclick="adminSetHealth('${playerId}')">Установить здоровье</button>
                    <input type="text" class="admin-input" id="skill_${playerId}" placeholder="Навык (cooking, building...)" value="cooking">
                    <input type="number" class="admin-input" id="skillValue_${playerId}" placeholder="Значение" value="10">
                    <button class="admin-btn" onclick="adminSetSkill('${playerId}')">Установить навык</button>
                    <select class="admin-input" id="clothes_${playerId}">
                        <option value="summer_clothes_man">Одежда мужская летняя</option>
                        <option value="summer_clothes_woman">Одежда женская летняя</option>
                        <option value="winter_clothes_man">Одежда мужская зимняя</option>
                        <option value="winter_clothes_woman">Одежда женская зимняя</option>
                    </select>
                    <button class="admin-btn" onclick="adminGiveClothes('${playerId}')">Выдать одежду</button>
                </div>
            </li>
        `;
    });
    html += '</ul>';
    listContainer.innerHTML = html;
}

// Функции админ-действий
window.adminSetMoney = function(playerId) {
    const input = document.getElementById(`money_${playerId}`);
    const amount = parseInt(input.value) || 0;
    
    const playerAgents = window.agents.getAllAgents().filter(a => a.ownerId === playerId);
    if (playerAgents.length === 0) return;
    
    // Начисляем деньги первому агенту
    const agent = playerAgents[0];
    const existingMoney = agent.inventory.find(item => item.type === 'money');
    if (existingMoney) {
        existingMoney.amount = amount;
    } else {
        agent.inventory.push({ type: 'money', amount: amount });
    }
    
    if (window.addLogEntry) {
        window.addLogEntry(`💰 Админ начислил ${amount} монет игроку ${playerId.substring(0, 8)}`);
    }
    
    loadAdminPlayerList();
};

window.adminSetHealth = function(playerId) {
    const input = document.getElementById(`health_${playerId}`);
    const health = parseInt(input.value) || 100;
    
    const playerAgents = window.agents.getAllAgents().filter(a => a.ownerId === playerId);
    playerAgents.forEach(agent => {
        agent.health = Math.max(0, Math.min(100, health));
    });
    
    if (window.addLogEntry) {
        window.addLogEntry(`❤️ Админ установил здоровье ${health}% игроку ${playerId.substring(0, 8)}`);
    }
};

window.adminSetSkill = function(playerId) {
    const skillInput = document.getElementById(`skill_${playerId}`);
    const valueInput = document.getElementById(`skillValue_${playerId}`);
    const skill = skillInput.value;
    const value = parseInt(valueInput.value) || 0;
    
    const playerAgents = window.agents.getAllAgents().filter(a => a.ownerId === playerId);
    playerAgents.forEach(agent => {
        if (agent.experience && agent.experience[skill] !== undefined) {
            agent.experience[skill] = value;
        }
    });
    
    if (window.addLogEntry) {
        window.addLogEntry(`📚 Админ установил навык ${skill} = ${value} игроку ${playerId.substring(0, 8)}`);
    }
};

window.adminGiveClothes = function(playerId) {
    const select = document.getElementById(`clothes_${playerId}`);
    const clothesType = select.value;
    
    const playerAgents = window.agents.getAllAgents().filter(a => a.ownerId === playerId);
    if (playerAgents.length > 0) {
        const agent = playerAgents[0];
        agent.inventory.push({ type: clothesType, amount: 1 });
        
        if (window.addLogEntry) {
            window.addLogEntry(`👕 Админ выдал одежду игроку ${playerId.substring(0, 8)}`);
        }
    }
};

// Инициализация сетевого подключения
function initializeNetwork() {
    const loginModal = document.getElementById('loginModal');
    const mainContainer = document.getElementById('mainContainer');
    const connectBtn = document.getElementById('connectBtn');
    const playerNameInput = document.getElementById('playerNameInput');
    const worldIdInput = document.getElementById('worldIdInput');
    const adminPasswordInput = document.getElementById('adminPasswordInput');
    const connectionStatus = document.getElementById('connectionStatus');

    // Обработчик подключения
    connectBtn.addEventListener('click', () => {
        const playerName = playerNameInput.value.trim();
        const worldId = worldIdInput.value.trim() || 'default';
        const adminPassword = adminPasswordInput ? adminPasswordInput.value.trim() : '';

        if (!playerName) {
            connectionStatus.textContent = 'Введите имя игрока';
            connectionStatus.className = 'connection-status error';
            return;
        }

        // Проверка админ-пароля
        if (adminPassword === window.adminPassword) {
            window.isAdmin = true;
            if (window.addLogEntry) {
                window.addLogEntry('🔐 Вы вошли как администратор');
            }
        } else {
            window.isAdmin = false;
        }

        connectionStatus.textContent = 'Подключение...';
        connectionStatus.className = 'connection-status connecting';

        // Подключаемся к серверу
        window.networkManager.connect('http://localhost:3000');

        // Обработчик ошибки подключения
        window.networkManager.onConnectionError = (error) => {
            connectionStatus.innerHTML = `
                Не удалось подключиться к серверу.<br>
                <small>Запустите сервер: <code>cd backend && npm start</code></small><br>
                <button id="playOfflineBtn" class="control-btn" style="margin-top: 10px;">Играть офлайн</button>
            `;
            connectionStatus.className = 'connection-status error';
            
            // Обработчик кнопки офлайн режима
            setTimeout(() => {
                const offlineBtn = document.getElementById('playOfflineBtn');
                if (offlineBtn) {
                    offlineBtn.addEventListener('click', () => {
                        startOfflineMode(playerName);
                    });
                }
            }, 100);
        };

        // Ждем подключения
        const checkConnection = setInterval(() => {
            if (window.networkManager.isConnected) {
                clearInterval(checkConnection);
                
                // Регистрируем игрока
                window.networkManager.register(playerName, worldId);

                // Настраиваем обработчик получения состояния мира
                window.networkManager.onWorldStateCallback = (data) => {
                    connectionStatus.textContent = 'Подключено!';
                    connectionStatus.className = 'connection-status connected';
                    
                    // Скрываем модальное окно и показываем игру
                    setTimeout(() => {
                        loginModal.style.display = 'none';
                        mainContainer.style.display = 'grid';
                        
                        // Показываем админ-кнопку, если админ
                        if (window.isAdmin) {
                            const adminTabBtn = document.getElementById('adminTabBtn');
                            if (adminTabBtn) {
                                adminTabBtn.style.display = 'block';
                                adminTabBtn.addEventListener('click', () => {
                                    window.showAdminPanel();
                                });
                            }
                            if (window.addLogEntry) {
                                window.addLogEntry('🔐 Вы вошли как администратор');
                            }
                        }
                        
                        // Инициализируем игру с данными с сервера
                        initializeGameWithServerData(data);
                    }, 500);
                };
            }
        }, 100);

        // Таймаут подключения
        setTimeout(() => {
            if (!window.networkManager.isConnected) {
                clearInterval(checkConnection);
                if (!connectionStatus.textContent.includes('Не удалось')) {
                    connectionStatus.innerHTML = `
                        Не удалось подключиться к серверу.<br>
                        <small>Запустите сервер: <code>cd backend && npm start</code></small><br>
                        <button id="playOfflineBtn" class="control-btn" style="margin-top: 10px;">Играть офлайн</button>
                    `;
                    connectionStatus.className = 'connection-status error';
                    
                    // Обработчик кнопки офлайн режима
                    setTimeout(() => {
                        const offlineBtn = document.getElementById('playOfflineBtn');
                        if (offlineBtn) {
                            offlineBtn.addEventListener('click', () => {
                                startOfflineMode(playerName);
                            });
                        }
                    }, 100);
                }
            }
        }, 5000);
    });

    // Подключение по Enter
    playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            connectBtn.click();
        }
    });
}

// Инициализация игры с данными сервера
function initializeGameWithServerData(data) {
    // Создаем мир
    initializeCanvas();
    
    // Получаем playerId из networkManager
    const playerId = window.networkManager && window.networkManager.socket ? 
                     window.networkManager.socket.id : null;
    
    // Создаем агентов с playerId (семья для текущего игрока)
    if (window.agents && playerId) {
        window.agents.playerId = playerId;
        window.agents.initializeAgents(playerId);
        
        if (window.addLogEntry) {
            window.addLogEntry(`👨‍👩‍👧‍👦 Создана ваша семья (${window.agents.getPlayerAgents().length} человек)`);
        }
    }
    
    // Загружаем состояние мира с сервера
    if (data.world) {
        // Загружаем ресурсы
        if (data.world.resources) {
            window.world.resources = data.world.resources.map(r => ({
                type: r.type,
                x: r.x,
                y: r.y,
                amount: r.amount,
                id: r.id
            }));
        }

        // Загружаем животных
        if (data.world.animals) {
            window.world.animals = data.world.animals.map(a => ({
                type: a.type,
                x: a.x,
                y: a.y,
                health: a.health,
                hunger: a.hunger,
                owner: a.owner,
                tamed: a.tamed,
                id: a.id
            }));
        }

        // Загружаем хищников
        if (data.world.predators) {
            window.world.predators = data.world.predators.map(p => ({
                type: p.type,
                x: p.x,
                y: p.y,
                health: p.health,
                hunger: p.hunger,
                target: p.target,
                id: p.id
            }));
        }

        // Загружаем костры
        if (data.world.fires) {
            window.world.fires = data.world.fires.map(f => ({
                x: f.x,
                y: f.y,
                intensity: f.intensity,
                id: f.id
            }));
        }

        // Загружаем постройки
        if (data.world.buildings) {
            if (!window.world.buildings) {
                window.world.buildings = [];
            }
            window.world.buildings = data.world.buildings.map(b => ({
                type: b.type,
                x: b.x,
                y: b.y,
                id: b.id
            }));
        }

        // Обновляем погоду и время
        if (data.world.weather) window.world.weather = data.world.weather;
        if (data.world.timeOfDay) window.world.timeOfDay = data.world.timeOfDay;
        if (data.world.day) window.world.day = data.world.day;
    }

    // Инициализируем симуляцию
    initializeSimulation();

    // Интегрируем сетевые функции в существующие обработчики
    integrateNetworkWithWorld();
}

// Интеграция сетевых функций с миром
function integrateNetworkWithWorld() {
    // Сохраняем оригинальные методы
    const originalAddResource = window.world.addResource.bind(window.world);
    const originalAddAnimal = window.world.addAnimal.bind(window.world);
    const originalAddPredator = window.world.addPredator.bind(window.world);

    // Переопределяем методы для отправки на сервер
    window.world.addResource = function(type) {
        if (!this.canvas) return;
        
        const viewWidth = this.canvas.width / this.camera.scale;
        const viewHeight = this.canvas.height / this.camera.scale;
        const margin = 50;
        const x = this.camera.x + margin + Math.random() * (viewWidth - margin * 2);
        const y = this.camera.y + margin + Math.random() * (viewHeight - margin * 2);

        // Отправляем на сервер
        if (window.networkManager && window.networkManager.isConnected) {
            window.networkManager.addResource(type, x, y, 1);
        }

        // Добавляем локально
        originalAddResource(type);
    };

    window.world.addAnimal = function(type) {
        if (!this.canvas) return;
        
        const viewWidth = this.canvas.width / this.camera.scale;
        const viewHeight = this.canvas.height / this.camera.scale;
        const margin = 50;
        const x = this.camera.x + margin + Math.random() * (viewWidth - margin * 2);
        const y = this.camera.y + margin + Math.random() * (viewHeight - margin * 2);

        if (window.networkManager && window.networkManager.isConnected) {
            window.networkManager.addAnimal(type, x, y);
        }

        originalAddAnimal(type);
    };

    window.world.addPredator = function(type) {
        if (!this.canvas) return;
        
        const viewWidth = this.canvas.width / this.camera.scale;
        const viewHeight = this.canvas.height / this.camera.scale;
        const margin = 50;
        const x = this.camera.x + margin + Math.random() * (viewWidth - margin * 2);
        const y = this.camera.y + margin + Math.random() * (viewHeight - margin * 2);

        if (window.networkManager && window.networkManager.isConnected) {
            window.networkManager.addPredator(type, x, y);
        }

        originalAddPredator(type);
    };

    // Обновление камеры
    const originalDraw = window.world.draw.bind(window.world);
    window.world.draw = function() {
        originalDraw();
        
        // Отправляем обновление камеры на сервер
        if (window.networkManager && window.networkManager.isConnected && this.frameCount % 10 === 0) {
            window.networkManager.updateCamera(this.camera);
        }
        this.frameCount = (this.frameCount || 0) + 1;
    };
}

// Запуск офлайн режима
function startOfflineMode(playerName) {
    const loginModal = document.getElementById('loginModal');
    const mainContainer = document.getElementById('mainContainer');
    const connectionStatus = document.getElementById('connectionStatus');
    const adminPasswordInput = document.getElementById('adminPasswordInput');
    
    // Проверка админ-пароля
    const adminPassword = adminPasswordInput ? adminPasswordInput.value.trim() : '';
    if (adminPassword === window.adminPassword) {
        window.isAdmin = true;
    } else {
        window.isAdmin = false;
    }
    
    connectionStatus.textContent = 'Офлайн режим';
    connectionStatus.className = 'connection-status connecting';
    
    // Скрываем модальное окно и показываем игру
    setTimeout(() => {
        loginModal.style.display = 'none';
        mainContainer.style.display = 'grid';
        
        // Показываем админ-кнопку, если админ
        if (window.isAdmin) {
            const adminTabBtn = document.getElementById('adminTabBtn');
            if (adminTabBtn) {
                adminTabBtn.style.display = 'block';
                adminTabBtn.addEventListener('click', () => {
                    window.showAdminPanel();
                });
            }
            if (window.addLogEntry) {
                window.addLogEntry('🔐 Вы вошли как администратор');
            }
        }
        
        // Инициализируем игру без сервера
        initializeCanvas();
        
        // В офлайн режиме создаем агентов без ownerId (NPC)
        if (window.agents) {
            window.agents.initializeAgents(null);
        }
        
        initializeSimulation();
        
        if (window.addLogEntry) {
            window.addLogEntry(`🎮 Игра запущена в офлайн режиме (${playerName})`);
            window.addLogEntry('⚠️ Сетевые функции недоступны');
        }
    }, 500);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    initializeNetwork();
});
