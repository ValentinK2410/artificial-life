// Модуль для работы с агентами

class Agent {
    constructor(name, age, gender, type) {
        this.name = name;
        this.age = age;
        this.gender = gender;
        this.type = type;
        
        // Характеристики
        this.health = 100;
        this.energy = 100;
        this.hunger = 0;
        this.mood = 'neutral'; // neutral, happy, sad, anxious
        
        // Позиция
        this.position = { x: 0, y: 0 };
        
        // Инвентарь и память
        this.inventory = [];
        this.memory = []; // [{type: 'berry', x: 100, y: 200}, ...]
        
        // Состояние для конечного автомата
        this.state = 'explore'; // explore, findFood, rest
        this.speed = 2; // Базовая скорость движения
        this.maxEnergy = 100;
        this.maxHealth = 100;
        
        // Инициализация случайной позиции
        this.initializePosition();
    }

    initializePosition() {
        // Устанавливаем случайную позицию на карте
        if (window.world && window.world.canvas) {
            this.position.x = Math.random() * window.world.canvas.width;
            this.position.y = Math.random() * window.world.canvas.height;
        } else {
            this.position.x = 100 + Math.random() * 200;
            this.position.y = 100 + Math.random() * 200;
        }
    }

    update() {
        // Основной цикл обновления агента
        // Увеличиваем голод
        this.hunger += 0.5;
        if (this.hunger > 100) this.hunger = 100;
        
        // Уменьшаем энергию при движении
        if (this.state !== 'rest') {
            this.energy -= 0.3;
            if (this.energy < 0) this.energy = 0;
        }
        
        // Если голод > 80, начинаем терять здоровье
        if (this.hunger > 80) {
            this.health -= 0.5;
            if (this.health < 0) this.health = 0;
        }
        
        // Если энергия < 20, снижаем скорость
        if (this.energy < 20) {
            this.speed = 1;
        } else {
            this.speed = 2;
        }
        
        // Принятие решений
        this.decide();
        
        // Взаимодействие с миром
        if (window.world) {
            this.interactWithWorld(window.world);
        }
    }

    decide() {
        // Простой конечный автомат для принятия решений
        if (this.hunger > 70) {
            this.state = 'findFood';
        } else if (this.energy < 30) {
            this.state = 'rest';
        } else {
            this.state = 'explore';
        }
        
        this.act();
    }

    act() {
        // Выполнение действий в зависимости от состояния
        switch(this.state) {
            case 'explore':
                this.moveToRandomPoint();
                this.scanForResources();
                break;
            case 'findFood':
                let foodLocation = this.memory.find(item => item.type === 'berry' || item.type === 'berries');
                if (foodLocation) {
                    this.moveTo(foodLocation.x, foodLocation.y);
                } else {
                    this.moveToRandomPoint();
                    this.scanForResources();
                }
                break;
            case 'rest':
                // Восстановление энергии на месте
                this.energy += 10;
                if (this.energy > this.maxEnergy) {
                    this.energy = this.maxEnergy;
                }
                break;
        }
    }

    moveTo(x, y) {
        // Движение к указанной точке
        const dx = x - this.position.x;
        const dy = y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > this.speed) {
            // Двигаемся в направлении цели
            this.position.x += (dx / distance) * this.speed;
            this.position.y += (dy / distance) * this.speed;
        } else {
            // Достигли цели
            this.position.x = x;
            this.position.y = y;
        }
        
        // Ограничиваем позицию границами canvas
        if (window.world && window.world.canvas) {
            this.position.x = Math.max(0, Math.min(this.position.x, window.world.canvas.width));
            this.position.y = Math.max(0, Math.min(this.position.y, window.world.canvas.height));
        }
    }

    moveToRandomPoint() {
        // Движение к случайной точке
        if (window.world && window.world.canvas) {
            const targetX = Math.random() * window.world.canvas.width;
            const targetY = Math.random() * window.world.canvas.height;
            this.moveTo(targetX, targetY);
        }
    }

    scanForResources() {
        // Сканирование ресурсов вокруг агента
        if (!window.world) return;
        
        const scanRadius = 50;
        const resources = window.world.resources;
        
        resources.forEach(resource => {
            const dx = resource.x - this.position.x;
            const dy = resource.y - this.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= scanRadius) {
                // Проверяем, нет ли уже этого ресурса в памяти
                const existingMemory = this.memory.find(m => 
                    Math.abs(m.x - resource.x) < 10 && 
                    Math.abs(m.y - resource.y) < 10 &&
                    m.type === resource.type
                );
                
                if (!existingMemory) {
                    // Добавляем в память
                    this.memory.push({
                        type: resource.type,
                        x: resource.x,
                        y: resource.y
                    });
                }
            }
        });
    }

    interactWithWorld(world) {
        // Взаимодействие с миром - проверка ресурсов под ногами
        const resource = world.getResourceAt(this.position.x, this.position.y);
        
        if (resource) {
            // Собираем ресурс
            if (resource.type === 'berries' || resource.type === 'berry') {
                // Уменьшаем голод
                this.hunger -= 20;
                if (this.hunger < 0) this.hunger = 0;
                
                // Добавляем в инвентарь
                this.inventory.push({
                    type: 'berries',
                    amount: resource.amount || 1
                });
                
                // Удаляем ресурс из мира
                const index = world.resources.indexOf(resource);
                if (index > -1) {
                    world.resources.splice(index, 1);
                }
                
                // Удаляем из памяти
                const memoryIndex = this.memory.findIndex(m => 
                    Math.abs(m.x - resource.x) < 10 && 
                    Math.abs(m.y - resource.y) < 10
                );
                if (memoryIndex > -1) {
                    this.memory.splice(memoryIndex, 1);
                }
                
                // Логирование
                if (window.addLogEntry) {
                    window.addLogEntry(`${this.name} нашел ягоды в (${Math.floor(resource.x)}, ${Math.floor(resource.y)})`);
                }
            } else if (resource.type === 'wood') {
                // Собираем дрова
                this.inventory.push({
                    type: 'wood',
                    amount: resource.amount || 1
                });
                
                // Удаляем ресурс из мира
                const index = world.resources.indexOf(resource);
                if (index > -1) {
                    world.resources.splice(index, 1);
                }
                
                // Логирование
                if (window.addLogEntry) {
                    window.addLogEntry(`${this.name} собрал дрова в (${Math.floor(resource.x)}, ${Math.floor(resource.y)})`);
                }
            }
        }
    }

    // Методы для совместимости со старым кодом
    get x() {
        return this.position.x;
    }

    set x(value) {
        this.position.x = value;
    }

    get y() {
        return this.position.y;
    }

    set y(value) {
        this.position.y = value;
    }

    getStateName() {
        if (this.health > 70) return 'Здоров';
        if (this.health > 40) return 'Ранен';
        return 'Болен';
    }

    getPsycheName() {
        if (this.mood === 'neutral') return 'Спокоен';
        if (this.mood === 'anxious') return 'Напряжен';
        if (this.mood === 'happy') return 'Счастлив';
        return 'Грустен';
    }
}

// Дочерние классы

class YoungMan extends Agent {
    constructor(name, age, type) {
        super(name, age, 'male', type);
        this.energy = 100;
        this.maxEnergy = 100;
        this.speed = 3; // Быстрее двигается
        this.maxHealth = 100;
    }
}

class OldMan extends Agent {
    constructor(name, age, type) {
        super(name, age, 'male', type);
        this.energy = 60; // Низкая базовая энергия
        this.maxEnergy = 60;
        this.speed = 1; // Медленнее двигается
        this.maxHealth = 80;
    }

    update() {
        // Старик быстрее теряет здоровье
        super.update();
        if (this.hunger > 60) {
            this.health -= 0.8; // Больше теряет здоровье
        }
    }
}

class YoungWoman extends Agent {
    constructor(name, age, type) {
        super(name, age, 'female', type);
        this.energy = 90;
        this.maxEnergy = 90;
        this.speed = 2.5; // Быстрее двигается
        this.maxHealth = 100;
    }
}

class OldWoman extends Agent {
    constructor(name, age, type) {
        super(name, age, 'female', type);
        this.energy = 55; // Низкая базовая энергия
        this.maxEnergy = 55;
        this.speed = 1; // Медленнее двигается
        this.maxHealth = 75;
    }

    update() {
        // Старуха быстрее теряет здоровье
        super.update();
        if (this.hunger > 60) {
            this.health -= 0.9; // Больше теряет здоровье
        }
    }
}

// Класс для среднего возраста (для совместимости)
class MiddleAgedMan extends Agent {
    constructor(name, age, type) {
        super(name, age, 'male', type);
        this.energy = 85;
        this.maxEnergy = 85;
        this.speed = 2;
        this.maxHealth = 100;
    }
}

class MiddleAgedWoman extends Agent {
    constructor(name, age, type) {
        super(name, age, 'female', type);
        this.energy = 80;
        this.maxEnergy = 80;
        this.speed = 2;
        this.maxHealth = 100;
    }
}

class AgentsManager {
    constructor() {
        this.agents = [];
        this.initializeAgents();
    }

    initializeAgents() {
        // Инициализация 6 агентов с использованием дочерних классов
        this.agents = [
            new MiddleAgedMan('Мужчина', 35, 'man'),
            new MiddleAgedWoman('Женщина', 32, 'woman'),
            new YoungMan('Парень', 18, 'boy'),
            new YoungWoman('Девушка', 17, 'girl'),
            new OldMan('Старик', 68, 'oldman'),
            new OldWoman('Старуха', 65, 'oldwoman')
        ];
    }

    update() {
        // Обновление всех агентов
        this.agents.forEach(agent => {
            agent.update();
        });
    }

    getAgent(type) {
        return this.agents.find(agent => agent.type === type);
    }

    getAllAgents() {
        return this.agents;
    }

    reset() {
        this.initializeAgents();
        // Инициализация позиций агентов после сброса
        this.agents.forEach(agent => {
            agent.initializePosition();
        });
    }

    // Обновление UI агента
    updateAgentUI(agentType) {
        const agent = this.getAgent(agentType);
        if (!agent) return;

        const agentItem = document.querySelector(`[data-agent="${agentType}"]`).closest('.agent-item');
        if (agentItem) {
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
            if (stateSelect) {
                // Обновляем состояние на основе здоровья
                const healthState = agent.health > 70 ? 'healthy' : 
                                  agent.health > 40 ? 'wounded' : 'sick';
                stateSelect.value = healthState;
            }
            if (psycheSelect) {
                // Обновляем психику на основе настроения
                const psycheState = agent.mood === 'neutral' ? 'calm' :
                                   agent.mood === 'anxious' ? 'tense' : 'panic';
                psycheSelect.value = psycheState;
            }
            if (energySlider) {
                energySlider.value = Math.floor(agent.energy);
                if (energyValue) energyValue.textContent = Math.floor(agent.energy);
            }
            if (hungerSlider) {
                hungerSlider.value = Math.floor(agent.hunger);
                if (hungerValue) hungerValue.textContent = Math.floor(agent.hunger);
            }
            if (statusSpan) statusSpan.textContent = agent.getStateName();
        }
    }

    // Обновление UI всех агентов
    updateAllAgentsUI() {
        this.agents.forEach(agent => {
            this.updateAgentUI(agent.type);
        });
    }
}

// Создание глобального экземпляра менеджера агентов
const agents = new AgentsManager();
window.agents = agents;
