// Типы агентов

import { Agent } from './Agent.js';

export class YoungMan extends Agent {
    constructor(name, age, type, ownerId = null) {
        super(name, age, 'male', type, ownerId);
        this.energy = 100;
        this.maxEnergy = 100;
        this.speed = 3;
        this.maxHealth = 100;
        this.initializeExperience(0.1);
    }
    
    initializeExperience(multiplier) {
        Object.keys(this.experience).forEach(key => {
            this.experience[key] = Math.floor(Math.random() * 10 * multiplier);
        });
    }
}

export class MiddleAgedMan extends Agent {
    constructor(name, age, type, ownerId = null) {
        super(name, age, 'male', type, ownerId);
        this.energy = 85;
        this.maxEnergy = 85;
        this.speed = 2;
        this.maxHealth = 100;
        this.initializeExperience(0.5);
    }
    
    initializeExperience(multiplier) {
        Object.keys(this.experience).forEach(key => {
            this.experience[key] = Math.floor(10 + Math.random() * 30 * multiplier);
        });
    }
}

export class OldMan extends Agent {
    constructor(name, age, type, ownerId = null) {
        super(name, age, 'male', type, ownerId);
        this.energy = 60;
        this.maxEnergy = 60;
        this.speed = 1;
        this.maxHealth = 80;
        this.canBuildFire = true;
        this.initializeExperience(1.5);
    }
    
    initializeExperience(multiplier) {
        Object.keys(this.experience).forEach(key => {
            this.experience[key] = Math.floor(30 + Math.random() * 50 * multiplier);
            if (key === 'building' || key === 'farming' || key === 'cooking') {
                this.experience[key] = Math.floor(60 + Math.random() * 40 * multiplier);
            }
        });
    }
}

export class YoungWoman extends Agent {
    constructor(name, age, type, ownerId = null) {
        super(name, age, 'female', type, ownerId);
        this.energy = 90;
        this.maxEnergy = 90;
        this.speed = 2.5;
        this.maxHealth = 100;
        this.initializeExperience(0.1);
    }
    
    initializeExperience(multiplier) {
        Object.keys(this.experience).forEach(key => {
            this.experience[key] = Math.floor(Math.random() * 10 * multiplier);
        });
    }
}

export class MiddleAgedWoman extends Agent {
    constructor(name, age, type, ownerId = null) {
        super(name, age, 'female', type, ownerId);
        this.energy = 80;
        this.maxEnergy = 80;
        this.speed = 2;
        this.maxHealth = 100;
        this.initializeExperience(0.5);
    }
    
    initializeExperience(multiplier) {
        Object.keys(this.experience).forEach(key => {
            this.experience[key] = Math.floor(10 + Math.random() * 30 * multiplier);
        });
    }
}

export class OldWoman extends Agent {
    constructor(name, age, type, ownerId = null) {
        super(name, age, 'female', type, ownerId);
        this.energy = 55;
        this.maxEnergy = 55;
        this.speed = 1;
        this.maxHealth = 75;
        this.canBuildFire = true;
        this.initializeExperience(1.5);
    }
    
    initializeExperience(multiplier) {
        Object.keys(this.experience).forEach(key => {
            this.experience[key] = Math.floor(30 + Math.random() * 50 * multiplier);
            if (key === 'building' || key === 'farming' || key === 'cooking') {
                this.experience[key] = Math.floor(60 + Math.random() * 40 * multiplier);
            }
        });
    }
}
