// Мир по умолчанию

import { World } from './World.js';
import { GAME_CONFIG } from '../config/constants.js';

export class DefaultWorld extends World {
    constructor(canvasElement) {
        super(canvasElement);
    }
    
    setupCanvas() {
        // Настройка контекста и размеров
        this.ctx = this.canvas.getContext('2d');
        
        const resizeCanvas = () => {
            const container = this.canvas.parentElement;
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Обработчики событий мыши и touch
        this.setupMouseHandlers();
    }
    
    setupMouseHandlers() {
        // Этот метод будет содержать всю логику обработки мыши и touch
        // Перенесем из world.js
        if (!this.canvas) return;
        
        // Получение координат мыши с учетом камеры
        const getWorldCoords = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: (e.clientX - rect.left) / this.camera.scale + this.camera.x,
                y: (e.clientY - rect.top) / this.camera.scale + this.camera.y
            };
        };
        
        // Глобальные координаты мыши для подсказок
        this.mouseScreenX = 0;
        this.mouseScreenY = 0;
        
        // Наведение мыши
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseScreenX = e.clientX - rect.left;
            this.mouseScreenY = e.clientY - rect.top;
            this.canvas._lastMouseEvent = e;
            const worldCoords = getWorldCoords(e);
            this.mouse.x = worldCoords.x;
            this.mouse.y = worldCoords.y;
            
            this.mouse.hoveredObject = this.getObjectAt(worldCoords.x, worldCoords.y);
            
            if (this.mouse.isDown && this.mouse.draggedObject) {
                this.mouse.draggedObject.x = worldCoords.x;
                this.mouse.draggedObject.y = worldCoords.y;
                if (this.mouse.draggedObject.position) {
                    this.mouse.draggedObject.position.x = worldCoords.x;
                    this.mouse.draggedObject.position.y = worldCoords.y;
                }
            } else if (this.mouse.isDown && this.mouse.dragStart) {
                const rect = this.canvas.getBoundingClientRect();
                const dx = (e.clientX - this.mouse.dragStart.x) / this.camera.scale;
                const dy = (e.clientY - this.mouse.dragStart.y) / this.camera.scale;
                this.camera.x -= dx;
                this.camera.y -= dy;
                this.mouse.dragStart = { x: e.clientX, y: e.clientY };
            }
            
            this.draw();
        });
        
        // Нажатие мыши
        this.canvas.addEventListener('mousedown', (e) => {
            const worldCoords = getWorldCoords(e);
            this.mouse.isDown = true;
            
            const obj = this.getObjectAt(worldCoords.x, worldCoords.y);
            if (obj) {
                this.mouse.draggedObject = obj;
            } else {
                this.mouse.dragStart = { x: e.clientX, y: e.clientY };
            }
        });
        
        // Отпускание мыши
        this.canvas.addEventListener('mouseup', () => {
            this.mouse.isDown = false;
            this.mouse.draggedObject = null;
            this.mouse.dragStart = null;
        });
        
        // Выход мыши за пределы canvas
        this.canvas.addEventListener('mouseleave', () => {
            this.mouse.isDown = false;
            this.mouse.draggedObject = null;
            this.mouse.dragStart = null;
            this.mouse.hoveredObject = null;
        });
        
        // Масштабирование колесиком мыши
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.camera.scale *= delta;
            this.camera.scale = Math.max(0.5, Math.min(2.0, this.camera.scale));
            this.draw();
        });
        
        // ========== TOUCH СОБЫТИЯ ДЛЯ МОБИЛЬНЫХ ==========
        let touchStart = null;
        let touchStartTime = 0;
        let lastTouchDistance = 0;
        let isPinching = false;
        
        const getTouchCoords = (touch) => {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: (touch.clientX - rect.left) / this.camera.scale + this.camera.x,
                y: (touch.clientY - rect.top) / this.camera.scale + this.camera.y
            };
        };
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                touchStart = { x: touch.clientX, y: touch.clientY };
                touchStartTime = Date.now();
                this.mouse.isDown = true;
                
                const worldCoords = getTouchCoords(touch);
                const obj = this.getObjectAt(worldCoords.x, worldCoords.y);
                if (obj) {
                    this.mouse.draggedObject = obj;
                } else {
                    this.mouse.dragStart = { x: touch.clientX, y: touch.clientY };
                }
            } else if (e.touches.length === 2) {
                isPinching = true;
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                lastTouchDistance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) +
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );
            }
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && touchStart) {
                const touch = e.touches[0];
                const worldCoords = getTouchCoords(touch);
                this.mouse.x = worldCoords.x;
                this.mouse.y = worldCoords.y;
                
                if (this.mouse.draggedObject) {
                    this.mouse.draggedObject.x = worldCoords.x;
                    this.mouse.draggedObject.y = worldCoords.y;
                    if (this.mouse.draggedObject.position) {
                        this.mouse.draggedObject.position.x = worldCoords.x;
                        this.mouse.draggedObject.position.y = worldCoords.y;
                    }
                } else if (this.mouse.dragStart) {
                    const dx = (touch.clientX - this.mouse.dragStart.x) / this.camera.scale;
                    const dy = (touch.clientY - this.mouse.dragStart.y) / this.camera.scale;
                    this.camera.x -= dx;
                    this.camera.y -= dy;
                    this.mouse.dragStart = { x: touch.clientX, y: touch.clientY };
                }
                
                this.draw();
            } else if (e.touches.length === 2 && isPinching) {
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const distance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) +
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );
                const scaleChange = distance / lastTouchDistance;
                this.camera.scale *= scaleChange;
                this.camera.scale = Math.max(0.5, Math.min(2.0, this.camera.scale));
                lastTouchDistance = distance;
                this.draw();
            }
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (e.touches.length === 0) {
                if (touchStart) {
                    const timeDiff = Date.now() - touchStartTime;
                    const touch = e.changedTouches[0];
                    
                    if (timeDiff < 300 && touch) {
                        const dx = Math.abs(touch.clientX - touchStart.x);
                        const dy = Math.abs(touch.clientY - touchStart.y);
                        if (dx < 10 && dy < 10) {
                            const worldCoords = getTouchCoords(touch);
                            this.handleClick(worldCoords.x, worldCoords.y);
                        }
                    }
                }
                
                touchStart = null;
                this.mouse.isDown = false;
                this.mouse.draggedObject = null;
                this.mouse.dragStart = null;
                isPinching = false;
            } else if (e.touches.length === 1) {
                isPinching = false;
            }
        });
        
        this.canvas.addEventListener('touchcancel', () => {
            touchStart = null;
            this.mouse.isDown = false;
            this.mouse.draggedObject = null;
            this.mouse.dragStart = null;
            isPinching = false;
        });
    }
    
    handleClick(x, y) {
        if (window.simulation && window.simulation.handleCanvasClick) {
            window.simulation.handleCanvasClick(x, y);
        }
    }
    
    getObjectAt(x, y) {
        const searchRadius = 20 / this.camera.scale;
        
        if (window.agents) {
            const agents = window.agents.getAllAgents();
            for (let agent of agents) {
                const ax = agent.position ? agent.position.x : agent.x;
                const ay = agent.position ? agent.position.y : agent.y;
                const distance = Math.sqrt(Math.pow(ax - x, 2) + Math.pow(ay - y, 2));
                if (distance < searchRadius) {
                    return { type: 'agent', obj: agent, name: agent.name };
                }
            }
        }
        
        // Проверяем ресурсы
        for (let resource of this.resources) {
            const distance = Math.sqrt(Math.pow(resource.x - x, 2) + Math.pow(resource.y - y, 2));
            if (distance < searchRadius) {
                return { type: 'resource', obj: resource, name: this.getResourceDisplayName(resource.type) };
            }
        }
        
        // Проверяем животных
        for (let animal of this.animals) {
            const distance = Math.sqrt(Math.pow(animal.x - x, 2) + Math.pow(animal.y - y, 2));
            if (distance < searchRadius) {
                return { type: 'animal', obj: animal, name: this.getAnimalName(animal.type) };
            }
        }
        
        return null;
    }
    
    generateTerrain() {
        const worldSize = GAME_CONFIG.WORLD.DEFAULT_SIZE;
        this.terrain.worldSize = worldSize;
        
        // Полянка в центре
        this.terrain.clearing = {
            x: worldSize / 2,
            y: worldSize / 2,
            radius: GAME_CONFIG.WORLD.CLEARING_RADIUS
        };
        
        // Пруд в центре
        this.terrain.pond = {
            centerX: worldSize / 2,
            centerY: worldSize / 2,
            radiusX: GAME_CONFIG.WORLD.POND_RADIUS_X,
            radiusY: GAME_CONFIG.WORLD.POND_RADIUS_Y
        };
        
        // Генерируем деревья
        this.terrain.forest = [];
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * worldSize;
            const y = Math.random() * worldSize;
            const distToPond = Math.sqrt(
                Math.pow(x - this.terrain.pond.centerX, 2) +
                Math.pow(y - this.terrain.pond.centerY, 2)
            );
            if (distToPond > this.terrain.pond.radiusX + 50) {
                this.terrain.forest.push({ x, y });
            }
        }
        
        // Генерируем камни
        this.terrain.stones = [];
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * worldSize;
            const y = Math.random() * worldSize;
            this.terrain.stones.push({ x, y });
        }
        
        // Генерируем кусты с ягодами
        this.terrain.berryBushes = [];
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * worldSize;
            const y = Math.random() * worldSize;
            const distToPond = Math.sqrt(
                Math.pow(x - this.terrain.pond.centerX, 2) +
                Math.pow(y - this.terrain.pond.centerY, 2)
            );
            if (distToPond > this.terrain.pond.radiusX + 30) {
                this.terrain.berryBushes.push({
                    x: x,
                    y: y,
                    berries: 5 + Math.floor(Math.random() * 10)
                });
                this.resources.push({
                    type: 'berries',
                    x: x,
                    y: y,
                    amount: 5 + Math.floor(Math.random() * 10),
                    id: 'resource_' + Date.now() + '_' + Math.random()
                });
            }
        }
    }
    
    // Методы для работы с ресурсами, животными и т.д. будут добавлены
    // Пока оставим заглушки, которые будут реализованы позже
    
    addResource(type) {
        if (!this.canvas) return;
        
        const viewWidth = this.canvas.width / this.camera.scale;
        const viewHeight = this.canvas.height / this.camera.scale;
        const margin = 50;
        const x = this.camera.x + margin + Math.random() * (viewWidth - margin * 2);
        const y = this.camera.y + margin + Math.random() * (viewHeight - margin * 2);
        
        let amount = 1;
        if (type === 'berries') amount = 10;
        else if (['meat', 'bird', 'fish', 'cooked_food'].includes(type)) amount = 1;
        else if (type === 'money') amount = 10 + Math.floor(Math.random() * 50);
        else if (type === 'wood') amount = 5;
        
        this.resources.push({
            type: type,
            x: x,
            y: y,
            amount: amount,
            id: 'resource_' + Date.now() + '_' + Math.random()
        });
        
        this.draw();
    }
    
    getResourceAt(x, y) {
        const searchRadius = 15;
        
        for (let i = 0; i < this.resources.length; i++) {
            const resource = this.resources[i];
            const distance = Math.sqrt(
                Math.pow(resource.x - x, 2) + 
                Math.pow(resource.y - y, 2)
            );
            
            if (distance <= searchRadius) {
                return resource;
            }
        }
        
        return null;
    }
    
    getResourceDisplayName(type) {
        // Будет использовать ItemRegistry
        return type;
    }
    
    getAnimalName(type) {
        const names = {
            'cow': 'Корова',
            'goat': 'Коза',
            'sheep': 'Овца',
            'rooster': 'Петух',
            'chicken': 'Курица',
            'cat': 'Кошка',
            'bull': 'Бык'
        };
        return names[type] || type;
    }
    
    draw() {
        // Основной метод отрисовки будет реализован
        // Пока заглушка
        if (!this.ctx || !this.canvas) return;
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.save();
        this.ctx.scale(this.camera.scale, this.camera.scale);
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Отрисовка будет добавлена
        
        this.ctx.restore();
        
        if (this.mouse.hoveredObject) {
            this.drawTooltip(this.mouse.hoveredObject);
        }
    }
    
    drawTooltip(obj) {
        // Реализация подсказок
    }
}
