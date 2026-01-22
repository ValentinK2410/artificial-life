// Константы игры

export const GAME_CONFIG = {
    // Настройки симуляции
    SIMULATION: {
        DEFAULT_SPEED: 20,
        MAX_SPEED: 50,
        MIN_SPEED: 1
    },
    
    // Настройки агентов
    AGENTS: {
        DEFAULT_HEALTH: 100,
        DEFAULT_ENERGY: 100,
        DEFAULT_HUNGER: 0,
        DEFAULT_TEMPERATURE: 37,
        MIN_TEMPERATURE: 32, // Смерть от переохлаждения
        MAX_HUNGER: 100
    },
    
    // Настройки обучения
    TRAINING: {
        SKILL_COST: 10, // Стоимость обучения навыку в монетах
        EXPERIENCE_GAIN: 5 // Базовый опыт при обучении
    },
    
    // Настройки мира
    WORLD: {
        DEFAULT_SIZE: 5000,
        CLEARING_RADIUS: 400,
        POND_RADIUS_X: 150,
        POND_RADIUS_Y: 100
    },
    
    // Настройки админ-панели
    ADMIN: {
        PASSWORD: 'admin123' // В продакшене измените!
    }
};

// Типы предметов
export const ITEM_TYPES = {
    TOOLS: ['saw', 'axe', 'hammer', 'pickaxe', 'shovel', 'fishing_rod'],
    CLOTHES: ['summer_clothes_man', 'summer_clothes_woman', 'winter_clothes_man', 'winter_clothes_woman'],
    FOOD: ['berries', 'cooked_food', 'meat', 'bird', 'fish'],
    RESOURCES: ['wood', 'money', 'stone']
};

// Типы животных
export const ANIMAL_TYPES = {
    DOMESTIC: ['cow', 'goat', 'sheep', 'rooster', 'chicken', 'cat', 'bull'],
    PREDATORS: ['wolf', 'bear', 'fox']
};

// Навыки агентов
export const SKILLS = {
    SAW: 'saw',
    AXE: 'axe',
    HAMMER: 'hammer',
    PICKAXE: 'pickaxe',
    SHOVEL: 'shovel',
    FISHING: 'fishing',
    COOKING: 'cooking',
    BUILDING: 'building',
    FARMING: 'farming',
    HUNTING: 'hunting'
};
