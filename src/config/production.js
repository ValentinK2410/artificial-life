// Конфигурация для продакшена

export const PRODUCTION_CONFIG = {
    // Более строгие настройки для продакшена
    ADMIN: {
        // Пароль администратора - ИЗМЕНИТЕ НА СВОЙ!
        PASSWORD: process.env.ADMIN_PASSWORD || 'CHANGE_THIS_PASSWORD_IN_PRODUCTION'
    },
    
    // Настройки безопасности
    SECURITY: {
        // Минимальная длина имени игрока
        MIN_PLAYER_NAME_LENGTH: 3,
        MAX_PLAYER_NAME_LENGTH: 20,
        // Максимальное количество игроков в мире
        MAX_PLAYERS_PER_WORLD: 50
    },
    
    // Настройки производительности
    PERFORMANCE: {
        // Максимальная скорость симуляции
        MAX_SIMULATION_SPEED: 50,
        // Оптимизация отрисовки
        OPTIMIZE_RENDERING: true,
        // Кэширование
        ENABLE_CACHE: true
    },
    
    // Настройки логирования
    LOGGING: {
        // Уровень логирования (debug, info, warn, error)
        LEVEL: 'info',
        // Логировать в консоль
        CONSOLE: false,
        // Логировать на сервер
        SERVER: true
    }
};
