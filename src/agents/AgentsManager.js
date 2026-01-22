// Менеджер агентов

import { 
    YoungMan, 
    MiddleAgedMan, 
    OldMan, 
    YoungWoman, 
    MiddleAgedWoman, 
    OldWoman 
} from './AgentTypes.js';

export class AgentsManager {
    constructor(playerId = null) {
        this.agents = [];
        this.playerId = playerId;
        this.initializeAgents();
    }

    initializeAgents(playerId = null) {
        if (playerId) {
            this.playerId = playerId;
        }
        
        this.agents = [
            new MiddleAgedMan('Мужчина', 35, 'man', this.playerId),
            new MiddleAgedWoman('Женщина', 32, 'woman', this.playerId),
            new YoungMan('Парень', 18, 'boy', this.playerId),
            new YoungWoman('Девушка', 17, 'girl', this.playerId),
            new OldMan('Старик', 68, 'oldman', this.playerId),
            new OldWoman('Старуха', 65, 'oldwoman', this.playerId)
        ];
    }
    
    getPlayerAgents() {
        if (!this.playerId) return [];
        return this.agents.filter(agent => agent.ownerId === this.playerId);
    }
    
    getAgentById(agentId) {
        return this.agents.find(agent => agent.id === agentId);
    }
    
    getAgent(type) {
        return this.agents.find(agent => agent.type === type);
    }
    
    getAllAgents() {
        return this.agents;
    }
    
    update() {
        this.agents.forEach(agent => {
            agent.update();
        });
    }
    
    reset() {
        this.initializeAgents();
        this.agents.forEach(agent => {
            agent.initializePosition();
        });
    }
}
