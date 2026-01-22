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
        MAX_TEMPERATURE: 37, // Нормальная температура тела
        MAX_HUNGER: 100,
        
        // Настройки температуры
        TEMPERATURE: {
            // Температура окружающей среды по погоде (градусы Цельсия)
            AMBIENT_TEMP: {
                SUNNY: 25,      // Солнечная погода - тепло
                CLOUDY: 18,     // Облачно - прохладно
                RAIN: 10,       // Дождь - холодно
                NIGHT: 5,       // Ночь - очень холодно
                DEFAULT: 20     // По умолчанию
            },
            TEMP_CHANGE_RATE: 0.05,        // Скорость изменения температуры (0-1)
            FIRE_HEAT_BONUS: 25,           // Максимальный бонус тепла от костра
            FIRE_RADIUS: 80,               // Радиус действия костра
            MIN_AMBIENT_TEMP: 20,          // Минимальная температура окружающей среды
            HEALTH_LOSS_FROM_COLD_RATE: 0.02 // Скорость потери здоровья от холода
        },
        
        // Настройки голода
        HUNGER: {
            INCREASE_RATE: 0.005,       // Скорость увеличения голода за обновление (уменьшено для баланса)
            CRITICAL_THRESHOLD: 85,     // Порог, когда начинает теряться здоровье (увеличен)
            HEALTH_LOSS_RATE: 0.1,      // Скорость потери здоровья при критическом голоде (уменьшено)
            AUTO_EAT_THRESHOLD: 50,     // Порог, когда агент начинает есть из запасов (уменьшен)
            FOOD_RESTORE: 25,           // Сколько голода восстанавливает еда из запасов
            SEARCH_FOOD_THRESHOLD: 60,  // Порог, когда агент начинает искать еду (уменьшен)
            STORE_FOOD_THRESHOLD: 40,   // Порог, когда агент начинает запасать еду (уменьшен)
            WARNING_THRESHOLD: 90       // Порог для предупреждения о критическом голоде
        },
        
        HEALTH_LOSS_FROM_COLD_RATE: 0.02 // Скорость потери здоровья от холода (уменьшена)
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
    FOOD: ['berries', 'cooked_food', 'meat', 'bird', 'fish', 'honey', 'milk', 'water', 'bread', 'kebab', 'potato', 'salad', 'mushrooms', 'tea', 'banana', 'orange', 'apple', 'lemon', 'rosehip', 'cabbage', 'spices', 'mint', 'st_johns_wort'],
    RESOURCES: ['wood', 'money', 'stone']
};

// Категории продуктов
export const FOOD_CATEGORIES = {
    MEAT: ['meat', 'bird', 'fish', 'kebab'], // Мясные продукты
    VEGETABLES: ['potato', 'cabbage', 'salad', 'mushrooms'], // Овощи
    FRUITS: ['berries', 'banana', 'orange', 'apple', 'lemon'], // Фрукты
    BEVERAGES: ['water', 'milk', 'tea'], // Напитки
    HEALTHY: ['honey', 'rosehip', 'lemon', 'mint', 'st_johns_wort'], // Полезные для здоровья
    GRAINS: ['bread'], // Зерновые
    SPICES: ['spices'], // Специи
    PROCESSED: ['cooked_food'] // Обработанная еда
};

// Свойства продуктов
export const FOOD_PROPERTIES = {
    // Мясные продукты (высокая энергия и сытость)
    meat: { hunger: -40, energy: +30, health: +5, stamina: +10, category: 'MEAT' },
    bird: { hunger: -35, energy: +25, health: +5, stamina: +8, category: 'MEAT' },
    fish: { hunger: -30, energy: +20, health: +10, stamina: +5, category: 'MEAT' },
    kebab: { hunger: -50, energy: +40, health: +5, stamina: +15, category: 'MEAT' },
    
    // Овощи (низкая энергия, средняя сытость)
    potato: { hunger: -25, energy: +15, health: +3, stamina: +3, category: 'VEGETABLES' },
    cabbage: { hunger: -15, energy: +5, health: +8, stamina: +2, category: 'VEGETABLES' },
    salad: { hunger: -20, energy: +8, health: +10, stamina: +3, category: 'VEGETABLES' },
    mushrooms: { hunger: -18, energy: +10, health: +5, stamina: +4, category: 'VEGETABLES' },
    
    // Фрукты (средняя энергия, утоляют желание сладкого)
    berries: { hunger: -15, energy: +10, health: +5, stamina: +2, sweetDesire: -20, category: 'FRUITS' },
    banana: { hunger: -20, energy: +15, health: +5, stamina: +3, sweetDesire: -25, category: 'FRUITS' },
    orange: { hunger: -18, energy: +12, health: +8, stamina: +2, sweetDesire: -20, category: 'FRUITS' },
    apple: { hunger: -15, energy: +10, health: +6, stamina: +2, sweetDesire: -18, category: 'FRUITS' },
    lemon: { hunger: -10, energy: +5, health: +15, immunity: +10, stamina: +1, category: 'FRUITS' },
    
    // Напитки (утоляют жажду)
    water: { thirst: -50, health: +2, stamina: +1, category: 'BEVERAGES' },
    milk: { hunger: -10, thirst: -20, energy: +8, health: +5, stamina: +2, category: 'BEVERAGES' },
    tea: { thirst: -30, energy: +5, health: +3, stamina: +2, category: 'BEVERAGES' },
    
    // Полезные для здоровья (укрепляют иммунитет)
    honey: { hunger: -20, energy: +25, health: +10, immunity: +5, sweetDesire: -30, stamina: +5, category: 'HEALTHY' },
    rosehip: { hunger: -5, energy: +3, health: +20, immunity: +15, stamina: +2, category: 'HEALTHY' },
    mint: { hunger: -5, energy: +2, health: +12, immunity: +8, stamina: +1, category: 'HEALTHY' },
    st_johns_wort: { hunger: -5, energy: +2, health: +15, immunity: +12, stamina: +1, category: 'HEALTHY' },
    
    // Зерновые
    bread: { hunger: -30, energy: +20, health: +3, stamina: +5, category: 'GRAINS' },
    
    // Специи (увеличивают аппетит)
    spices: { appetite: +20, health: +2, category: 'SPICES' },
    
    // Обработанная еда
    cooked_food: { hunger: -35, energy: +25, health: +5, stamina: +8, category: 'PROCESSED' }
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
    HUNTING: 'hunting',
    FIRE_BUILDING: 'fire_building', // Разжигание костра
    BRING_WOOD: 'bring_wood', // Приносить дрова к костру
    GATHER_WOOD: 'gather_wood', // Собирать дрова самостоятельно
    GATHER_FISH: 'gather_fish', // Собирать рыбу
    GATHER_ALL: 'gather_all' // Собирать все объекты
};
