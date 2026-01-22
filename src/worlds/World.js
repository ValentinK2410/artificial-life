// Базовый класс мира

export class World {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = null;
        this.day = 1;
        this.timeOfDay = 'day'; // day, night
        this.weather = 'sunny'; // sunny, rain, night
        this.isRunning = false;
        this.simulationSpeed = 5;
        this.animationFrameId = null;
        this.resources = [];
        this.fires = [];
        this.animals = [];
        this.predators = [];
        this.buildings = [];
        
        // Система камеры
        this.camera = {
            x: 0,
            y: 0,
            scale: 1.0
        };
        
        // Управление мышью
        this.mouse = {
            x: 0,
            y: 0,
            isDown: false,
            dragStart: null,
            draggedObject: null,
            hoveredObject: null
        };
        
        // Структура мира
        this.terrain = {
            forest: [],
            pond: null,
            clearing: null,
            stones: [],
            berryBushes: []
        };
        
        if (this.canvas) {
            this.setupCanvas();
        }
    }
    
    setupCanvas() {
        // Будет реализовано в дочерних классах
    }
    
    generateTerrain() {
        // Будет реализовано в дочерних классах
    }
    
    draw() {
        // Будет реализовано в дочерних классах
    }
    
    reset() {
        this.resources = [];
        this.fires = [];
        this.animals = [];
        this.predators = [];
        this.buildings = [];
        this.generateTerrain();
    }
}
