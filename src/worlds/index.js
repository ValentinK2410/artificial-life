// Экспорт миров

export { World } from './World.js';
export { DefaultWorld } from './DefaultWorld.js';

// Фабрика для создания миров
export function createWorld(type, canvasElement) {
    switch(type) {
        case 'default':
        default:
            return new DefaultWorld(canvasElement);
    }
}
