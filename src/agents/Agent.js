// Базовый класс агента

import { GAME_CONFIG, SKILLS } from '../config/constants.js';

export class Agent {
    constructor(name, age, gender, type, ownerId = null) {
        this.name = name;
        this.age = age;
        this.gender = gender;
        this.type = type;
        this.ownerId = ownerId;
        
        // Характеристики
        this.health = GAME_CONFIG.AGENTS.DEFAULT_HEALTH;
        this.energy = GAME_CONFIG.AGENTS.DEFAULT_ENERGY;
        this.hunger = GAME_CONFIG.AGENTS.DEFAULT_HUNGER;
        this.temperature = GAME_CONFIG.AGENTS.DEFAULT_TEMPERATURE;
        this.mood = 'neutral';
        
        // Позиция
        this.position = { x: 0, y: 0 };
        this.targetPosition = null;
        this.isPlayerControlled = false;
        this.id = 'agent_' + Date.now() + '_' + Math.random();
        
        // Инвентарь и память
        this.inventory = [];
        this.memory = [];
        this.foodStorage = [];
        this.animalFoodStorage = [];
        this.pets = [];
        
        // Система опыта
        this.experience = {
            [SKILLS.SAW]: 0,
            [SKILLS.AXE]: 0,
            [SKILLS.HAMMER]: 0,
            [SKILLS.PICKAXE]: 0,
            [SKILLS.SHOVEL]: 0,
            [SKILLS.FISHING]: 0,
            [SKILLS.COOKING]: 0,
            [SKILLS.BUILDING]: 0,
            [SKILLS.FARMING]: 0,
            [SKILLS.HUNTING]: 0
        };
        
        // Состояние
        this.state = 'explore';
        this.speed = 2;
        this.maxEnergy = GAME_CONFIG.AGENTS.DEFAULT_ENERGY;
        this.maxHealth = GAME_CONFIG.AGENTS.DEFAULT_HEALTH;
        this.canBuildFire = false;
        this.defenseSkill = 0;
        this.nearbyPredator = null;
        
        this.initializePosition();
    }
    
    initializePosition() {
        if (window.world && window.world.canvas) {
            this.position.x = Math.random() * window.world.canvas.width;
            this.position.y = Math.random() * window.world.canvas.height;
        } else {
            this.position.x = 100 + Math.random() * 200;
            this.position.y = 100 + Math.random() * 200;
        }
    }
    
    // Базовые методы будут добавлены из agents.js
    // Пока заглушки
    update() {
        // Будет реализовано
    }
    
    decide() {
        // Будет реализовано
    }
    
    act() {
        // Будет реализовано
    }
    
    moveTo(x, y) {
        // Будет реализовано
    }
    
    setTarget(x, y) {
        this.targetPosition = { x, y };
        this.isPlayerControlled = true;
        this.state = 'explore';
    }
    
    clearTarget() {
        this.targetPosition = null;
        this.isPlayerControlled = false;
    }
    
    gainExperience(skill, amount) {
        if (this.experience[skill] !== undefined) {
            this.experience[skill] += amount;
        }
    }
}
