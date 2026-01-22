# Модульная структура проекта

## Структура каталогов

```
src/
├── config/              # Конфигурация и константы
│   └── constants.js    # Все константы игры
│
├── worlds/              # Миры
│   ├── World.js        # Базовый класс мира
│   ├── DefaultWorld.js # Мир по умолчанию
│   └── index.js        # Экспорт и фабрика миров
│
├── items/               # Предметы (разбиты по категориям)
│   ├── tools/          # Инструменты (будущие модули)
│   ├── clothes/        # Одежда (будущие модули)
│   ├── food/           # Еда (будущие модули)
│   ├── resources/      # Ресурсы (будущие модули)
│   ├── ItemRegistry.js # Реестр всех предметов
│   └── index.js        # Экспорт
│
├── agents/              # Агенты
│   ├── Agent.js        # Базовый класс агента
│   ├── AgentTypes.js   # Типы агентов (YoungMan, OldMan и т.д.)
│   ├── AgentsManager.js # Менеджер агентов
│   └── index.js        # Экспорт
│
├── ui/                  # Интерфейс (будущие модули)
│   ├── panels/         # Панели управления
│   ├── modals/         # Модальные окна
│   └── components/     # UI компоненты
│
├── network/             # Сетевое взаимодействие
│   ├── NetworkManager.js # Менеджер сети
│   └── index.js        # Экспорт
│
└── utils/               # Утилиты (будущие модули)
    ├── logger.js       # Логирование
    └── helpers.js      # Вспомогательные функции
```

## Как добавить новый мир

1. Создайте файл `src/worlds/MyWorld.js`:

```javascript
import { World } from './World.js';

export class MyWorld extends World {
    generateTerrain() {
        // Ваша логика генерации
    }
    
    draw() {
        // Ваша логика отрисовки
    }
}
```

2. Добавьте в `src/worlds/index.js`:

```javascript
export { MyWorld } from './MyWorld.js';

export function createWorld(type, canvasElement) {
    switch(type) {
        case 'myworld':
            return new MyWorld(canvasElement);
        // ...
    }
}
```

## Как добавить новый предмет

1. Откройте `src/items/ItemRegistry.js`
2. Добавьте в соответствующую категорию:

```javascript
export const ITEMS = {
    tools: {
        // ... существующие
        newTool: {
            id: 'newTool',
            name: 'Новый инструмент',
            category: 'tool',
            skill: 'building',
            description: 'Описание'
        }
    }
};
```

## Как добавить новый тип агента

1. Создайте класс в `src/agents/AgentTypes.js`:

```javascript
export class Child extends Agent {
    constructor(name, age, type, ownerId = null) {
        super(name, age, 'neutral', type, ownerId);
        this.energy = 50;
        this.speed = 1.5;
        // ...
    }
}
```

2. Добавьте в `AgentsManager.initializeAgents()` при необходимости

## Преимущества

- ✅ Модульность: каждый компонент независим
- ✅ Расширяемость: легко добавлять новые элементы
- ✅ Организация: логическое разделение по функциональности
- ✅ Масштабируемость: проще поддерживать большой проект
- ✅ Тестируемость: каждый модуль можно тестировать отдельно
