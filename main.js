// Основной файл для управления интерфейсом и симуляцией

// Класс Simulation для управления всей симуляцией
class Simulation {
    constructor(world, agentsManager) {
        this.world = world;
        this.agentsManager = agentsManager;
        this.agents = agentsManager.getAllAgents();
        this.isRunning = false;
        this.animationFrameId = null;
        this.colonyDeadShown = false; // Флаг для показа сообщения о гибели колонии
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
            'hunting': 'Охота',
            'fire_building': 'Разжигание костра',
            'bring_wood': 'Принесение дров',
            'gather_wood': 'Сбор дров',
            'gather_fish': 'Сбор рыбы',
            'gather_all': 'Сбор ресурсов'
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
                <button class="agent-tab-btn" data-tab="learned">Полученные навыки</button>
                <button class="agent-tab-btn" data-tab="commands">Команды</button>
            </div>
            <div class="agent-control-content">
                <!-- Вкладка: Информация -->
                <div class="agent-tab-panel active" data-panel="info">
                    <div class="agent-info">
                        <p><strong>Здоровье:</strong> ${Math.floor(agent.health)}%</p>
                        <p><strong>Энергия:</strong> ${Math.floor(agent.energy)}%</p>
                        <p><strong>Голод:</strong> ${Math.floor(agent.hunger)}%</p>
                        <p><strong>Жажда:</strong> ${Math.floor(agent.thirst || 0)}%</p>
                        <p><strong>Температура:</strong> ${Math.floor(agent.temperature || 37)}°C</p>
                        <p><strong>Деньги:</strong> ${this.getPlayerMoney()} монет</p>
                        <p><strong>Возраст:</strong> ${agent.age} лет</p>
                        <p><strong>Состояние:</strong> ${this.getStateName(agent.state)}</p>
                        ${agent.fear > 0 ? `<p><strong>Страх:</strong> ${Math.floor(agent.fear)}% ${agent.panic ? '😱 ПАНИКА!' : ''}</p>` : ''}
                        ${agent.panic ? `<p style="color: #ff4444;"><strong>⚠️ ПАНИКА!</strong></p>` : ''}
                    </div>
                </div>
                
                <!-- Вкладка: Навыки -->
                <div class="agent-tab-panel" data-panel="skills">
                    <div class="skills-container">
                        ${skillsHTML || '<p style="color: #888; text-align: center; padding: 20px;">Навыки еще не изучены</p>'}
                    </div>
                </div>
                
                <!-- Вкладка: Полученные навыки -->
                <div class="agent-tab-panel" data-panel="learned">
                    <div class="learned-skills-container">
                        ${this.getLearnedSkillsHTML(agent)}
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
                        <button class="command-btn" onclick="window.simulation.giveCommand('buildFire')" 
                                ${agent.experience.fire_building <= 0 ? 'disabled style="opacity: 0.5;"' : ''}>
                            🔥 Разжечь костер ${agent.experience.fire_building <= 0 ? '(нет навыка)' : ''}
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
    
    // Получить HTML для полученных навыков
    getLearnedSkillsHTML(agent) {
        const learnedSkills = [];
        const skillNames = {
            'saw': { name: 'Работа с пилой', icon: '🪚', threshold: 10 },
            'axe': { name: 'Работа с топором', icon: '🪓', threshold: 10 },
            'hammer': { name: 'Работа с молотком', icon: '🔨', threshold: 10 },
            'pickaxe': { name: 'Работа с киркой', icon: '⛏️', threshold: 10 },
            'shovel': { name: 'Работа с лопатой', icon: '🪤', threshold: 10 },
            'fishing': { name: 'Рыбалка', icon: '🎣', threshold: 10 },
            'cooking': { name: 'Готовка', icon: '🍳', threshold: 10 },
            'building': { name: 'Строительство', icon: '🏗️', threshold: 10 },
            'farming': { name: 'Фермерство', icon: '🌾', threshold: 10 },
            'hunting': { name: 'Охота', icon: '🎯', threshold: 10 },
            'fire_building': { name: 'Разжигание костра', icon: '🔥', threshold: 5 },
            'bring_wood': { name: 'Принесение дров', icon: '🪵', threshold: 5 },
            'gather_wood': { name: 'Сбор дров', icon: '🪵', threshold: 5 },
            'gather_fish': { name: 'Сбор рыбы', icon: '🐟', threshold: 5 },
            'gather_all': { name: 'Сбор ресурсов', icon: '📦', threshold: 5 }
        };
        
        Object.entries(agent.experience || {}).forEach(([skill, xp]) => {
            const skillInfo = skillNames[skill];
            if (skillInfo && xp >= skillInfo.threshold) {
                const level = Math.floor(xp / 10);
                learnedSkills.push({
                    skill,
                    name: skillInfo.name,
                    icon: skillInfo.icon,
                    level,
                    xp
                });
            }
        });
        
        if (learnedSkills.length === 0) {
            return '<p style="color: #888; text-align: center; padding: 20px;">Навыки еще не получены (нужно минимум 5-10 опыта)</p>';
        }
        
        return `
            <div class="learned-skills-grid">
                ${learnedSkills.map(skill => `
                    <div class="learned-skill-card">
                        <div class="learned-skill-icon">${skill.icon}</div>
                        <div class="learned-skill-name">${skill.name}</div>
                        <div class="learned-skill-level">Уровень ${skill.level}</div>
                        <div class="learned-skill-xp">Опыт: ${Math.floor(skill.xp)}</div>
                    </div>
                `).join('')}
            </div>
        `;
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
                if (this.selectedAgent.experience.fire_building <= 0) {
                    if (window.addLogEntry) {
                        window.addLogEntry(`❌ ${this.selectedAgent.name} не умеет разжигать костер. Нужен навык "Разжигание костра"`);
                    }
                    return;
                }
                if (!this.selectedAgent.hasWoodForFire()) {
                    if (window.addLogEntry) {
                        window.addLogEntry(`❌ У ${this.selectedAgent.name} нет дров для костра`);
                    }
                    return;
                }
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
                this.selectedAgent.state = 'gather';
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
        if (!this.selectedAgent) {
            if (window.addLogEntry) {
                window.addLogEntry(`❌ Выберите агента для обучения`);
            }
            return;
        }
        
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
        const skills = Object.keys(this.selectedAgent.experience || {});
        if (skills.length === 0) {
            if (window.addLogEntry) {
                window.addLogEntry(`❌ У агента нет навыков для обучения`);
            }
            return;
        }
        
        const randomSkill = skills[Math.floor(Math.random() * skills.length)];
        const experienceGain = 5 + Math.floor(Math.random() * 10);
        
        // Проверяем, что метод gainExperience существует
        if (typeof this.selectedAgent.gainExperience === 'function') {
            this.selectedAgent.gainExperience(randomSkill, experienceGain);
        } else {
            // Если метода нет, добавляем опыт напрямую
            if (!this.selectedAgent.experience) {
                this.selectedAgent.experience = {};
            }
            if (!this.selectedAgent.experience[randomSkill]) {
                this.selectedAgent.experience[randomSkill] = 0;
            }
            this.selectedAgent.experience[randomSkill] += experienceGain;
            if (this.selectedAgent.experience[randomSkill] > 100) {
                this.selectedAgent.experience[randomSkill] = 100;
            }
        }
        
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
            const currentExp = this.selectedAgent.experience[randomSkill] || 0;
            window.addLogEntry(`📚 ${this.selectedAgent.name} обучился навыку "${skillNames[randomSkill] || randomSkill}" (+${experienceGain} опыта, всего: ${Math.floor(currentExp)})`);
        }
        
        // Обновляем панель управления, если она открыта
        if (document.getElementById('agentControlPanel')?.style.display === 'block') {
            this.showAgentControlPanel(this.selectedAgent);
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
        this.colonyDeadShown = false; // Сбрасываем флаг при рестарте
        
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
            
            // Проверка на смерть всех агентов
            this.checkAllAgentsDead();
            
            // Отправка обновлений агентов на сервер для мультиплеера
            if (window.networkManager && window.networkManager.isConnected) {
                const playerAgents = this.agentsManager ? this.agentsManager.getPlayerAgents() : this.agents.filter(a => a.ownerId);
                playerAgents.forEach(agent => {
                    if (agent && agent.ownerId) {
                        window.networkManager.agentUpdate({
                            id: agent.id,
                            owner: agent.ownerId,
                            position: agent.position,
                            health: agent.health,
                            energy: agent.energy,
                            hunger: agent.hunger,
                            state: agent.state,
                            name: agent.name
                        });
                    }
                });
            }
        }

        // Запрос следующего кадра
        this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }
    
    // Проверка на смерть всех агентов
    checkAllAgentsDead() {
        const playerAgents = this.agentsManager.getPlayerAgents();
        if (playerAgents.length === 0) return; // Нет агентов игрока
        
        const allDead = playerAgents.every(agent => agent.health <= 0);
        
        if (allDead && !this.colonyDeadShown) {
            this.colonyDeadShown = true;
            this.pause();
            this.showColonyDeadMessage();
        }
    }
    
    // Показать сообщение о гибели колонии
    showColonyDeadMessage() {
        // Создаем модальное окно
        const modal = document.createElement('div');
        modal.id = 'colonyDeadModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background-color: #2a2a2a;
            border: 3px solid #ff0000;
            border-radius: 15px;
            padding: 40px;
            max-width: 500px;
            text-align: center;
            color: #ffffff;
            box-shadow: 0 0 30px rgba(255, 0, 0, 0.5);
        `;
        
        const title = document.createElement('h2');
        title.textContent = '💀 Колония погибла';
        title.style.cssText = 'color: #ff0000; margin-bottom: 20px; font-size: 28px;';
        
        const message = document.createElement('p');
        message.textContent = 'К сожалению, вы не смогли достаточно позаботиться и вся ваша колония погибла.';
        message.style.cssText = 'font-size: 18px; margin-bottom: 30px; line-height: 1.6;';
        
        const button = document.createElement('button');
        button.textContent = 'Начать заново';
        button.style.cssText = `
            background-color: #4a9eff;
            color: white;
            border: none;
            padding: 15px 30px;
            font-size: 16px;
            border-radius: 8px;
            cursor: pointer;
            transition: background-color 0.3s;
        `;
        button.onmouseover = () => button.style.backgroundColor = '#5aaeff';
        button.onmouseout = () => button.style.backgroundColor = '#4a9eff';
        button.onclick = () => {
            this.colonyDeadShown = false;
            this.reset();
            document.body.removeChild(modal);
        };
        
        content.appendChild(title);
        content.appendChild(message);
        content.appendChild(button);
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        if (window.addLogEntry) {
            window.addLogEntry('💀 Вся колония погибла!');
        }
    }

    updateSidebar() {
        // Обновление компактного списка агентов
        this.updateAgentsCompactList();
        
        // Обновление статистики мира
        if (this.world) {
            this.updateWorldStats();
        }
    }

    updateAgentsCompactList() {
        const container = document.getElementById('agentsListContainer');
        if (!container) {
            console.warn('Контейнер agentsListContainer не найден');
            return;
        }
        
        // Получаем агентов из менеджера или напрямую
        let playerAgents = [];
        if (this.agentsManager) {
            // Сначала пытаемся получить агентов игрока
            playerAgents = this.agentsManager.getPlayerAgents();
            console.log('Агенты игрока:', playerAgents.length, 'playerId:', this.agentsManager.playerId);
            // Если нет агентов игрока или playerId не установлен, показываем всех
            if (playerAgents.length === 0 || !this.agentsManager.playerId) {
                playerAgents = this.agentsManager.getAllAgents();
                console.log('Все агенты:', playerAgents.length);
            }
        } else if (this.agents && Array.isArray(this.agents)) {
            playerAgents = this.agents;
            console.log('Агенты из this.agents:', playerAgents.length);
        } else {
            console.warn('Нет agentsManager и this.agents');
        }
        
        if (playerAgents.length === 0) {
            container.innerHTML = '<p style="color: #b0b0b0; text-align: center; padding: 20px;">Нет агентов</p>';
            console.warn('Список агентов пуст');
            return;
        }
        
        container.innerHTML = playerAgents.map(agent => {
            const health = Math.floor(agent.health || 0);
            const energy = Math.floor(agent.energy || 0);
            const hunger = Math.floor(agent.hunger || 0);
            const thirst = Math.floor(agent.thirst || 0);
            const temperature = Math.floor(agent.temperature || 37);
            const fear = Math.floor(agent.fear || 0);
            
            // Цвета для индикаторов
            const healthColor = health > 70 ? '#4caf50' : health > 40 ? '#ff9800' : '#f44336';
            const energyColor = energy > 50 ? '#4caf50' : energy > 20 ? '#ff9800' : '#f44336';
            const hungerColor = hunger < 50 ? '#4caf50' : hunger < 80 ? '#ff9800' : '#f44336';
            const thirstColor = thirst < 50 ? '#2196f3' : thirst < 80 ? '#ff9800' : '#f44336';
            const tempColor = temperature >= 35 ? '#4caf50' : temperature >= 32 ? '#ff9800' : '#f44336';
            
            // Состояние
            const stateName = this.getStateName(agent.state || 'explore');
            const healthState = health > 70 ? 'Здоров' : health > 40 ? 'Ранен' : 'Болен';
            const moodState = agent.panic ? '😱 Паника' : 
                             fear > 70 ? '😨 Сильный страх' :
                             fear > 40 ? '😰 Страх' :
                             agent.mood === 'happy' ? '😊 Счастлив' :
                             agent.mood === 'anxious' ? '😟 Напряжен' : '😐 Спокоен';
            
            return `
                <div class="agent-compact-card" data-agent-id="${agent.id}" onclick="window.simulation.selectAgentForControl('${agent.id}')">
                    <div class="agent-compact-header">
                        <div class="agent-compact-name">
                            <strong>${agent.name}</strong>
                            <span class="agent-compact-age">${agent.age} лет</span>
                        </div>
                        <div class="agent-compact-status" style="background-color: ${healthColor}20; color: ${healthColor};">
                            ${healthState}
                        </div>
                    </div>
                    <div class="agent-compact-stats">
                        <div class="agent-stat-row">
                            <span class="stat-label">❤️ Здоровье:</span>
                            <div class="stat-bar-container">
                                <div class="stat-bar" style="width: ${health}%; background-color: ${healthColor};"></div>
                                <span class="stat-value">${health}%</span>
                            </div>
                        </div>
                        <div class="agent-stat-row">
                            <span class="stat-label">⚡ Энергия:</span>
                            <div class="stat-bar-container">
                                <div class="stat-bar" style="width: ${energy}%; background-color: ${energyColor};"></div>
                                <span class="stat-value">${energy}%</span>
                            </div>
                        </div>
                        <div class="agent-stat-row">
                            <span class="stat-label">🍖 Голод:</span>
                            <div class="stat-bar-container">
                                <div class="stat-bar" style="width: ${hunger}%; background-color: ${hungerColor};"></div>
                                <span class="stat-value">${hunger}%</span>
                            </div>
                        </div>
                        <div class="agent-stat-row">
                            <span class="stat-label">💧 Жажда:</span>
                            <div class="stat-bar-container">
                                <div class="stat-bar" style="width: ${thirst}%; background-color: ${thirstColor};"></div>
                                <span class="stat-value">${thirst}%</span>
                            </div>
                        </div>
                        <div class="agent-stat-row">
                            <span class="stat-label">🌡️ Температура:</span>
                            <span class="stat-value" style="color: ${tempColor};">${temperature}°C</span>
                        </div>
                        <div class="agent-stat-row">
                            <span class="stat-label">📍 Состояние:</span>
                            <span class="stat-value">${stateName}</span>
                        </div>
                        ${fear > 0 ? `
                        <div class="agent-stat-row">
                            <span class="stat-label">😨 Страх:</span>
                            <span class="stat-value" style="color: ${fear > 70 ? '#f44336' : '#ff9800'};">${fear}%</span>
                        </div>
                        ` : ''}
                        <div class="agent-stat-row">
                            <span class="stat-label">😊 Настроение:</span>
                            <span class="stat-value">${moodState}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    selectAgentForControl(agentId) {
        const agent = this.agentsManager ? 
            this.agentsManager.getAllAgents().find(a => a.id === agentId) :
            this.agents.find(a => a.id === agentId);
        if (agent) {
            this.selectedAgent = agent;
            this.showAgentControlPanel(agent);
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
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('saw', 1);
            }
        }
        addLogEntry(`Пила добавлена на карту (${count} шт.)`);
    });
    document.getElementById('addAxeBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('axe', 1);
            }
        }
        addLogEntry(`Топор добавлен на карту (${count} шт.)`);
    });
    document.getElementById('addHammerBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('hammer', 1);
            }
        }
        addLogEntry(`Молоток добавлен на карту (${count} шт.)`);
    });
    document.getElementById('addPickaxeBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('pickaxe', 1);
            }
        }
        addLogEntry(`Кирка добавлена на карту (${count} шт.)`);
    });
    document.getElementById('addShovelBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('shovel', 1);
            }
        }
        addLogEntry(`Лопата добавлена на карту (${count} шт.)`);
    });
    document.getElementById('addFishingRodBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('fishing_rod', 1);
            }
        }
        addLogEntry(`Удочка добавлена на карту (${count} шт.)`);
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

    // Функция для получения выбранного количества ресурсов
    function getResourceAmount() {
        const select = document.getElementById('resourceAmount');
        return select ? parseInt(select.value) || 1 : 1;
    }
    
    // Ресурсы
    document.getElementById('addBerriesBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('berries', 1);
            }
        }
        addLogEntry(`Ягоды добавлены на карту (${count} шт.)`);
    });
    document.getElementById('addWoodBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('wood', 1);
            }
        }
        addLogEntry(`Дрова добавлены на карту (${count} шт.)`);
    });
    document.getElementById('addMoneyBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('money', 1);
            }
        }
        addLogEntry(`Деньги добавлены на карту (${count} шт.)`);
    });
    document.getElementById('addCookedFoodBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('cooked_food', 1);
            }
        }
        addLogEntry(`Готовая еда добавлена на карту (${count} шт.)`);
    });
    document.getElementById('addMeatBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('meat', 1);
            }
        }
        addLogEntry(`Мясо добавлено на карту (${count} шт.)`);
    });
    document.getElementById('addBirdBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('bird', 1);
            }
        }
        addLogEntry(`Птица добавлена на карту (${count} шт.)`);
    });
    document.getElementById('addFishBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('fish', 1);
            }
        }
        addLogEntry(`Рыба добавлена на карту (${count} шт.)`);
    });
    
    // Новые продукты
    document.getElementById('addHoneyBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('honey', 1);
            }
        }
        addLogEntry(`Мёд добавлен на карту (${count} шт.)`);
    });
    document.getElementById('addMilkBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('milk', 1);
            }
        }
        addLogEntry(`Молоко добавлено на карту (${count} шт.)`);
    });
    document.getElementById('addWaterBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('water', 1);
            }
        }
        addLogEntry(`Вода добавлена на карту (${count} шт.)`);
    });
    document.getElementById('addBreadBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('bread', 1);
            }
        }
        addLogEntry(`Хлеб добавлен на карту (${count} шт.)`);
    });
    document.getElementById('addKebabBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('kebab', 1);
            }
        }
        addLogEntry(`Шашлык добавлен на карту (${count} шт.)`);
    });
    document.getElementById('addPotatoBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('potato', 1);
            }
        }
        addLogEntry(`Картофель добавлен на карту (${count} шт.)`);
    });
    document.getElementById('addSaladBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('salad', 1);
            }
        }
        addLogEntry(`Салат добавлен на карту (${count} шт.)`);
    });
    document.getElementById('addMushroomsBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('mushrooms', 1);
            }
        }
        addLogEntry(`Грибы добавлены на карту (${count} шт.)`);
    });
    document.getElementById('addTeaBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('tea', 1);
            }
        }
        addLogEntry(`Чай добавлен на карту (${count} шт.)`);
    });
    document.getElementById('addBananaBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('banana', 1);
            }
        }
        addLogEntry(`Банан добавлен на карту (${count} шт.)`);
    });
    document.getElementById('addOrangeBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('orange', 1);
            }
        }
        addLogEntry(`Апельсин добавлен на карту (${count} шт.)`);
    });
    document.getElementById('addAppleBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('apple', 1);
            }
        }
        addLogEntry(`Яблоко добавлено на карту (${count} шт.)`);
    });
    document.getElementById('addLemonBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('lemon', 1);
            }
        }
        addLogEntry(`Лимон добавлен на карту (${count} шт.)`);
    });
    document.getElementById('addRosehipBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('rosehip', 1);
            }
        }
        addLogEntry(`Шиповник добавлен на карту (${count} шт.)`);
    });
    document.getElementById('addCabbageBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('cabbage', 1);
            }
        }
        addLogEntry(`Капуста добавлена на карту (${count} шт.)`);
    });
    document.getElementById('addSpicesBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('spices', 1);
            }
        }
        addLogEntry(`Специи добавлены на карту (${count} шт.)`);
    });
    document.getElementById('addMintBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('mint', 1);
            }
        }
        addLogEntry(`Мята добавлена на карту (${count} шт.)`);
    });
    document.getElementById('addStJohnsWortBtn')?.addEventListener('click', () => {
        const count = getResourceAmount();
        if (window.world) {
            for (let i = 0; i < count; i++) {
                world.addResource('st_johns_wort', 1);
            }
        }
        addLogEntry(`Зверобой добавлен на карту (${count} шт.)`);
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
        // Небольшая задержка для гарантии, что DOM готов
        setTimeout(() => {
            simulation.updateSidebar();
        }, 100);
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

        // Подключаемся к серверу (автоматически определит URL)
        window.networkManager.connect();

        // Обработчик ошибки подключения
        window.networkManager.onConnectionError = (error) => {
            const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
            const errorMessage = isProduction 
                ? 'Не удалось подключиться к серверу.<br><small>Сервер временно недоступен. Вы можете играть офлайн.</small>'
                : 'Не удалось подключиться к серверу.<br><small>Запустите сервер: <code>cd backend && npm start</code></small>';
            
            connectionStatus.innerHTML = `
                ${errorMessage}<br>
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
            
            // НЕ переходим автоматически в офлайн режим - пользователь должен выбрать сам
            // Мультиплеер важен, поэтому даем больше времени на подключение
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

        // Таймаут подключения (увеличен до 15 секунд для мобильных)
        setTimeout(() => {
            if (!window.networkManager.isConnected) {
                clearInterval(checkConnection);
                const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
                const errorMessage = isProduction 
                    ? 'Не удалось подключиться к серверу.<br><small>Сервер временно недоступен. Вы можете играть офлайн.</small>'
                    : 'Не удалось подключиться к серверу.<br><small>Запустите сервер: <code>cd backend && npm start</code></small>';
                
                if (!connectionStatus.textContent.includes('Не удалось')) {
                    connectionStatus.innerHTML = `
                        ${errorMessage}<br>
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
                    
                    // НЕ переходим автоматически в офлайн режим - пользователь должен выбрать сам
                    // Мультиплеер важен, поэтому даем возможность повторить попытку подключения
                }
            }
        }, 15000);
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
