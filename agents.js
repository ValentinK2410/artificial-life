// Модуль для работы с агентами

class Agent {
    constructor(name, age, type) {
        this.name = name;
        this.age = age;
        this.type = type;
        this.state = 'healthy'; // healthy, wounded, sick
        this.psyche = 'calm'; // calm, tense, panic
        this.energy = 80;
        this.hunger = 30;
        this.x = 0;
        this.y = 0;
    }

    update() {
        // Логика обновления состояния агента
        // Здесь будет реализована логика изменения энергии, голода и т.д.
    }

    getStateName() {
        const states = {
            'healthy': 'Здоров',
            'wounded': 'Ранен',
            'sick': 'Болен'
        };
        return states[this.state] || this.state;
    }

    getPsycheName() {
        const psyches = {
            'calm': 'Спокоен',
            'tense': 'Напряжен',
            'panic': 'Паника'
        };
        return psyches[this.psyche] || this.psyche;
    }
}

class AgentsManager {
    constructor() {
        this.agents = [];
        this.initializeAgents();
    }

    initializeAgents() {
        // Инициализация 6 агентов
        this.agents = [
            new Agent('Мужчина', 35, 'man'),
            new Agent('Женщина', 32, 'woman'),
            new Agent('Парень', 18, 'boy'),
            new Agent('Девушка', 17, 'girl'),
            new Agent('Старик', 68, 'oldman'),
            new Agent('Старуха', 65, 'oldwoman')
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
            if (stateSelect) stateSelect.value = agent.state;
            if (psycheSelect) psycheSelect.value = agent.psyche;
            if (energySlider) {
                energySlider.value = agent.energy;
                if (energyValue) energyValue.textContent = agent.energy;
            }
            if (hungerSlider) {
                hungerSlider.value = agent.hunger;
                if (hungerValue) hungerValue.textContent = agent.hunger;
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
