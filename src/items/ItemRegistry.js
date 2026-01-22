// Реестр всех предметов игры

import { ITEM_TYPES } from '../config/constants.js';

// Определения предметов
export const ITEMS = {
    // Инструменты
    tools: {
        saw: {
            id: 'saw',
            name: 'Пила',
            category: 'tool',
            skill: 'saw',
            description: 'Инструмент для распиловки дерева'
        },
        axe: {
            id: 'axe',
            name: 'Топор',
            category: 'tool',
            skill: 'axe',
            description: 'Инструмент для рубки дерева'
        },
        hammer: {
            id: 'hammer',
            name: 'Молоток',
            category: 'tool',
            skill: 'building',
            description: 'Инструмент для строительства'
        },
        pickaxe: {
            id: 'pickaxe',
            name: 'Кирка',
            category: 'tool',
            skill: 'building',
            description: 'Инструмент для добычи камня'
        },
        shovel: {
            id: 'shovel',
            name: 'Лопата',
            category: 'tool',
            skill: 'farming',
            description: 'Инструмент для работы с землей'
        },
        fishing_rod: {
            id: 'fishing_rod',
            name: 'Удочка',
            category: 'tool',
            skill: 'fishing',
            description: 'Инструмент для рыбалки'
        }
    },
    
    // Одежда
    clothes: {
        summer_clothes_man: {
            id: 'summer_clothes_man',
            name: 'Одежда мужская летняя',
            category: 'clothes',
            gender: 'male',
            season: 'summer',
            description: 'Легкая летняя одежда для мужчин'
        },
        summer_clothes_woman: {
            id: 'summer_clothes_woman',
            name: 'Одежда женская летняя',
            category: 'clothes',
            gender: 'female',
            season: 'summer',
            description: 'Легкая летняя одежда для женщин'
        },
        winter_clothes_man: {
            id: 'winter_clothes_man',
            name: 'Одежда мужская зимняя',
            category: 'clothes',
            gender: 'male',
            season: 'winter',
            temperatureBonus: 5, // Защита от холода
            description: 'Теплая зимняя одежда для мужчин'
        },
        winter_clothes_woman: {
            id: 'winter_clothes_woman',
            name: 'Одежда женская зимняя',
            category: 'clothes',
            gender: 'female',
            season: 'winter',
            temperatureBonus: 5,
            description: 'Теплая зимняя одежда для женщин'
        }
    },
    
    // Еда
    food: {
        berries: {
            id: 'berries',
            name: 'Ягоды',
            category: 'food',
            hungerRestore: 20,
            description: 'Свежие ягоды'
        },
        cooked_food: {
            id: 'cooked_food',
            name: 'Готовая еда',
            category: 'food',
            hungerRestore: 30,
            description: 'Приготовленная еда'
        },
        meat: {
            id: 'meat',
            name: 'Мясо',
            category: 'food',
            hungerRestore: 25,
            description: 'Сырое мясо'
        },
        bird: {
            id: 'bird',
            name: 'Птица',
            category: 'food',
            hungerRestore: 25,
            description: 'Птица'
        },
        fish: {
            id: 'fish',
            name: 'Рыба',
            category: 'food',
            hungerRestore: 25,
            description: 'Рыба'
        }
    },
    
    // Ресурсы
    resources: {
        wood: {
            id: 'wood',
            name: 'Дрова',
            category: 'resource',
            description: 'Дрова для костра'
        },
        money: {
            id: 'money',
            name: 'Деньги',
            category: 'resource',
            description: 'Деньги для торговли'
        },
        stone: {
            id: 'stone',
            name: 'Камень',
            category: 'resource',
            description: 'Камень для строительства'
        }
    }
};

// Получить предмет по ID
export function getItem(itemId) {
    for (let category of Object.values(ITEMS)) {
        if (category[itemId]) {
            return category[itemId];
        }
    }
    return null;
}

// Получить все предметы категории
export function getItemsByCategory(category) {
    return ITEMS[category] || {};
}

// Получить название предмета
export function getItemName(itemId) {
    const item = getItem(itemId);
    return item ? item.name : itemId;
}

// Проверить, является ли предмет инструментом
export function isTool(itemId) {
    return ITEM_TYPES.TOOLS.includes(itemId);
}

// Проверить, является ли предмет едой
export function isFood(itemId) {
    return ITEM_TYPES.FOOD.includes(itemId);
}

// Проверить, является ли предмет одеждой
export function isClothes(itemId) {
    return ITEM_TYPES.CLOTHES.includes(itemId);
}
