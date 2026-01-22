// Модуль для работы с агентами

class Agent {
    constructor(name, age, gender, type, ownerId = null) {
        this.name = name;
        this.age = age;
        this.gender = gender;
        this.type = type;
        this.ownerId = ownerId; // ID игрока-владельца (null = NPC)
        
        // Характеристики
        this.health = 100;
        this.energy = 100;
        this.hunger = 0;
        this.thirst = 0; // Жажда (0-100)
        this.sweetDesire = 0; // Желание сладкого (0-100)
        this.stamina = 100; // Выносливость (0-100)
        this.immunity = 50; // Иммунитет (0-100)
        this.appetite = 50; // Аппетит (0-100, влияет на эффективность еды)
        this.temperature = 37; // Нормальная температура тела (градусы Цельсия)
        this.mood = 'neutral'; // neutral, happy, sad, anxious
        
        // Позиция
        this.position = { x: 0, y: 0 };
        this.targetPosition = null; // Целевая позиция для ручного управления
        this.isPlayerControlled = false; // Управляется ли игроком
        this.id = 'agent_' + Date.now() + '_' + Math.random(); // Уникальный ID
        this.lastEatTime = 0; // Время последнего приема пищи (для ограничения частоты)
        
        // Инвентарь и память
        this.inventory = [];
        this.memory = []; // [{type: 'berry', x: 100, y: 200}, ...]
        this.foodStorage = []; // Запасы еды для себя
        this.animalFoodStorage = []; // Запасы еды для животных
        this.pets = []; // Домашние животные [{type, x, y, ...}]
        
        // Система опыта (разные виды опыта)
        this.experience = {
            saw: 0,           // Опыт работы с пилой
            axe: 0,           // Опыт работы с топором
            hammer: 0,        // Опыт работы с молотком
            pickaxe: 0,       // Опыт работы с киркой
            shovel: 0,        // Опыт работы с лопатой
            fishing: 0,       // Опыт рыбалки
            cooking: 0,       // Опыт готовки
            building: 0,      // Опыт строительства
            farming: 0,       // Опыт фермерства
            hunting: 0,       // Опыт охоты
            fire_building: 0, // Опыт разжигания костра
            bring_wood: 0,    // Опыт принесения дров
            gather_wood: 0,   // Опыт сбора дров
            gather_fish: 0,   // Опыт сбора рыбы
            gather_all: 0     // Опыт сбора всех объектов
        };
        
        // Эмоциональное состояние
        this.fear = 0; // Страх (0-100)
        this.panic = false; // Паника (true/false)
        
        // Состояние для конечного автомата
        this.state = 'explore'; // explore, findFood, rest, findHeat, buildFire, defend, feedAnimal, playWithPet, storeFood, cook, hunt, build, fish, farm
        this.speed = 2; // Базовая скорость движения
        this.maxEnergy = 100;
        this.maxHealth = 100;
        this.canBuildFire = false; // Может ли разводить костер
        this.defenseSkill = 0; // Навык обороны
        this.nearbyPredator = null; // Ближайший хищник
        
        // Инициализация случайной позиции
        this.initializePosition();
    }

    initializePosition() {
        // Устанавливаем случайную позицию на карте
        if (window.world && window.world.canvas) {
            this.position.x = Math.random() * window.world.canvas.width;
            this.position.y = Math.random() * window.world.canvas.height;
        } else {
            this.position.x = 100 + Math.random() * 200;
            this.position.y = 100 + Math.random() * 200;
        }
    }

    update() {
        // Если агент мертв - не обновляем его
        if (this.health <= 0) {
            this.state = 'dead';
            return;
        }
        
        // Основной цикл обновления агента
        const oldHunger = this.hunger;
        const oldHealth = this.health;
        const oldTemperature = this.temperature;
        
        // Получаем настройки голода (если доступны, иначе используем значения по умолчанию)
        const HUNGER_CONFIG = window.GAME_CONFIG?.AGENTS?.HUNGER || {
            INCREASE_RATE: 0.005,       // Исправлено: было 0.5 (слишком много!)
            CRITICAL_THRESHOLD: 85,
            HEALTH_LOSS_RATE: 0.1,      // Исправлено: было 0.5 (слишком много!)
            AUTO_EAT_THRESHOLD: 50,
            FOOD_RESTORE: 25,
            SEARCH_FOOD_THRESHOLD: 60,
            STORE_FOOD_THRESHOLD: 40,
            WARNING_THRESHOLD: 90
        };
        
        // Увеличиваем голод
        this.hunger += HUNGER_CONFIG.INCREASE_RATE;
        if (this.hunger > 100) this.hunger = 100;
        
        // Увеличиваем жажду (уменьшена скорость)
        this.thirst += 0.01;
        if (this.thirst > 100) this.thirst = 100;
        
        // Увеличиваем желание сладкого
        this.sweetDesire += 0.02;
        if (this.sweetDesire > 100) this.sweetDesire = 100;
        
        // Восстановление выносливости при отдыхе
        if (this.state === 'rest') {
            this.stamina += 0.5;
            if (this.stamina > 100) this.stamina = 100;
        } else {
            // Уменьшаем выносливость при активности
            this.stamina -= 0.1;
            if (this.stamina < 0) this.stamina = 0;
        }
        
        // Постепенное снижение иммунитета (если не поддерживается)
        if (this.immunity > 50) {
            this.immunity -= 0.01; // Медленное снижение к базовому уровню
        }
        
        // Постепенное снижение аппетита (если не поддерживается)
        if (this.appetite > 50) {
            this.appetite -= 0.01;
        }
        
        // Уменьшаем энергию при движении (зависит от выносливости)
        if (this.state !== 'rest') {
            const energyLoss = 0.3 * (1 - this.stamina / 200); // Чем больше выносливость, тем меньше потери
            this.energy -= energyLoss;
            if (this.energy < 0) this.energy = 0;
        }
        
        // Система температуры: проверяем расстояние до источников тепла
        this.updateTemperature();
        
        // Если температура слишком низкая, теряем здоровье (уменьшена скорость потери)
        if (this.temperature < 35) {
            const healthLoss = (35 - this.temperature) * 0.02; // Уменьшено с 0.1 до 0.02
            this.health -= healthLoss;
            if (this.health < 0) this.health = 0;
        }
        
        // Если голод критический, начинаем терять здоровье
        if (this.hunger > HUNGER_CONFIG.CRITICAL_THRESHOLD) {
            this.health -= HUNGER_CONFIG.HEALTH_LOSS_RATE;
            if (this.health < 0) this.health = 0;
        }
        
        // Используем запасы еды если голодны или хотим пить
        if ((this.hunger > HUNGER_CONFIG.AUTO_EAT_THRESHOLD || this.thirst > 60) && this.foodStorage.length > 0) {
            // Ищем подходящую еду
            let foodToEat = null;
            let foodIndex = -1;
            
            if (this.thirst > 60) {
                // Ищем напитки
                foodToEat = this.foodStorage.find((f, i) => {
                    const props = window.FOOD_PROPERTIES?.[f.type];
                    if (props && props.thirst) {
                        foodIndex = i;
                        return true;
                    }
                    return false;
                });
            }
            
            if (!foodToEat) {
                // Ищем любую еду
                foodToEat = this.foodStorage[0];
                foodIndex = 0;
            }
            
            if (foodToEat) {
                this.consumeFood(foodToEat.type);
                foodToEat.amount--;
                if (foodToEat.amount <= 0) {
                    this.foodStorage.splice(foodIndex, 1);
                }
                if (window.addLogEntry && Math.random() < 0.1) {
                    window.addLogEntry(`🍽️ ${this.name} ест из запасов: ${this.getFoodName(foodToEat.type)}`);
                }
            }
        }
        
        // Если энергия < 20, снижаем скорость
        if (this.energy < 20) {
            this.speed = 1;
        } else {
            this.speed = 2;
        }
        
        // Логирование критических состояний
        if (window.addLogEntry) {
            // Критический голод
            const WARNING_THRESHOLD = window.GAME_CONFIG?.AGENTS?.HUNGER?.WARNING_THRESHOLD || 90;
            if (this.hunger > WARNING_THRESHOLD && oldHunger <= WARNING_THRESHOLD) {
                window.addLogEntry(`⚠️ ${this.name} очень голоден!`);
            }
            // Критическая температура
            if (this.temperature < 35 && oldTemperature >= 35) {
                window.addLogEntry(`❄️ ${this.name} замерзает!`);
            }
            if (this.temperature < 32 && oldTemperature >= 32) {
                window.addLogEntry(`🥶 ${this.name} сильно замерзает!`);
            }
            // Критическое здоровье
            if (this.health < 20 && oldHealth >= 20) {
                window.addLogEntry(`⚠️ ${this.name} в критическом состоянии!`);
            }
            // Смерть (если здоровье упало до 0)
            if (this.health <= 0 && oldHealth > 0) {
                const cause = this.temperature < 32 ? 'от переохлаждения' : 'от голода и истощения';
                window.addLogEntry(`💀 ${this.name} погиб ${cause}`);
            }
        }
        
        // Принятие решений - ТОЛЬКО если игрок не управляет агентом
        if (!this.isPlayerControlled || !this.targetPosition) {
            this.decide();
        } else {
            // Если игрок управляет - устанавливаем состояние движения к цели
            this.state = 'moveToPoint';
            // ВЫЗЫВАЕМ act() для движения к цели
            this.act();
        }
        
        // Если decide() был вызван, act() уже вызван внутри него
        // Но если decide() не был вызван (игрок управляет), act() уже вызван выше
        
        // Взаимодействие с миром (только если не под управлением игрока)
        if (window.world && (!this.isPlayerControlled || !this.targetPosition)) {
            this.interactWithWorld(window.world);
            this.interactWithAnimals(window.world);
        }
    }
    
    interactWithAnimals(world) {
        // Взаимодействие с животными (приручение, кормление)
        if (!world.animals) return;
        
        world.animals.forEach(animal => {
            const dx = animal.x - this.position.x;
            const dy = animal.y - this.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Если животное близко и не приручено
            if (distance < 25 && !animal.tamed && !animal.owner) {
                // Попытка приручения (старики более успешны)
                const tamingChance = this.age > 60 ? 0.3 : (this.age > 30 ? 0.15 : 0.05);
                
                if (Math.random() < tamingChance) {
                    animal.tamed = true;
                    animal.owner = this.type;
                    this.pets.push(animal.id);
                    
                    this.gainExperience('farming', 2);
                    
                    if (window.addLogEntry) {
                        window.addLogEntry(`🐾 ${this.name} приручил ${world.getAnimalName(animal.type)}!`);
                    }
                }
            }
            
            // Если животное наше и голодное - кормим автоматически
            if (animal.owner === this.type && animal.hunger > 70 && distance < 20) {
                const food = this.animalFoodStorage.find(f => f.amount > 0);
                if (food) {
                    animal.hunger -= 25;
                    if (animal.hunger < 0) animal.hunger = 0;
                    food.amount--;
                    if (food.amount <= 0) {
                        const index = this.animalFoodStorage.indexOf(food);
                        if (index > -1) this.animalFoodStorage.splice(index, 1);
                    }
                }
            }
        });
    }

    updateTemperature() {
        // Получаем настройки температуры из конфига
        const TEMP_CONFIG = window.GAME_CONFIG?.AGENTS?.TEMPERATURE || {
            AMBIENT_TEMP: {
                SUNNY: 25,
                CLOUDY: 18,
                RAIN: 10,
                NIGHT: 5,
                DEFAULT: 20
            },
            TEMP_CHANGE_RATE: 0.05,
            FIRE_HEAT_BONUS: 25,
            FIRE_RADIUS: 80,
            MIN_AMBIENT_TEMP: 20,
            MOVEMENT_HEAT_BONUS: 5,
            MOVEMENT_THRESHOLD: 0.5
        };
        
        // Определяем температуру окружающей среды в зависимости от погоды
        let ambientTemp = TEMP_CONFIG.AMBIENT_TEMP.DEFAULT;
        
        if (window.world) {
            const weather = window.world.weather || 'sunny';
            const timeOfDay = window.world.timeOfDay || 'day';
            
            // Если ночь, используем ночную температуру
            if (weather === 'night' || timeOfDay === 'night') {
                ambientTemp = TEMP_CONFIG.AMBIENT_TEMP.NIGHT;
            } else {
                // Иначе используем температуру в зависимости от погоды
                switch (weather) {
                    case 'sunny':
                        ambientTemp = TEMP_CONFIG.AMBIENT_TEMP.SUNNY;
                        break;
                    case 'cloudy':
                        ambientTemp = TEMP_CONFIG.AMBIENT_TEMP.CLOUDY;
                        break;
                    case 'rain':
                        ambientTemp = TEMP_CONFIG.AMBIENT_TEMP.RAIN;
                        break;
                    default:
                        ambientTemp = TEMP_CONFIG.AMBIENT_TEMP.DEFAULT;
                }
            }
        }
        
        // Проверяем, движется ли агент
        let movementBonus = 0;
        if (this.lastPosition && this.position) {
            const dx = this.position.x - this.lastPosition.x;
            const dy = this.position.y - this.lastPosition.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Если агент движется (преодолел минимальное расстояние), добавляем бонус тепла
            if (distance > TEMP_CONFIG.MOVEMENT_THRESHOLD) {
                movementBonus = TEMP_CONFIG.MOVEMENT_HEAT_BONUS;
            }
        }
        
        // Ищем ближайший источник тепла (костер)
        const nearestFire = this.findNearestFire();
        let heatBonus = 0;
        
        if (nearestFire) {
            const distance = Math.sqrt(
                Math.pow(nearestFire.x - this.position.x, 2) + 
                Math.pow(nearestFire.y - this.position.y, 2)
            );
            // Тепло от костра уменьшается с расстоянием
            const fireRadius = nearestFire.heatRadius || TEMP_CONFIG.FIRE_RADIUS;
            if (distance < fireRadius) {
                const intensity = nearestFire.intensity || 1.0;
                heatBonus = (fireRadius - distance) / fireRadius * TEMP_CONFIG.FIRE_HEAT_BONUS * intensity;
            }
        }
        
        // Температура стремится к окружающей + тепло от костра + бонус от движения
        // При движении температура не может понижаться ниже текущей + бонус движения
        const targetTemp = ambientTemp + heatBonus + movementBonus;
        const tempDiff = targetTemp - this.temperature;
        
        // Если агент движется, температура не может понижаться
        if (movementBonus > 0 && tempDiff < 0) {
            // При движении температура может только повышаться или оставаться на месте
            const minTempWithMovement = this.temperature + movementBonus * TEMP_CONFIG.TEMP_CHANGE_RATE;
            this.temperature = Math.max(this.temperature, minTempWithMovement);
        } else {
            // Температура меняется постепенно
            this.temperature += tempDiff * TEMP_CONFIG.TEMP_CHANGE_RATE;
        }
        
        // Ограничиваем температуру
        const MIN_TEMP = TEMP_CONFIG.MIN_AMBIENT_TEMP || 20;
        const MAX_TEMP = window.GAME_CONFIG?.AGENTS?.MAX_TEMPERATURE || 37;
        if (this.temperature < MIN_TEMP) this.temperature = MIN_TEMP;
        if (this.temperature > MAX_TEMP) this.temperature = MAX_TEMP;
        
        // Сохраняем текущую позицию для следующего обновления
        if (this.position) {
            this.lastPosition = { x: this.position.x, y: this.position.y };
        }
    }

    findNearestFire() {
        if (!window.world || !window.world.fires) return null;
        
        let nearestFire = null;
        let minDistance = Infinity;
        
        window.world.fires.forEach(fire => {
            const distance = Math.sqrt(
                Math.pow(fire.x - this.position.x, 2) + 
                Math.pow(fire.y - this.position.y, 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                nearestFire = fire;
            }
        });
        
        return nearestFire;
    }

    decide() {
        // Простой конечный автомат для принятия решений
        const oldState = this.state;
        
        // КРИТИЧЕСКИ ВАЖНО: Если игрок управляет агентом - НЕ принимаем решения ИИ
        if (this.isPlayerControlled && this.targetPosition) {
            // Игрок управляет - остаемся в состоянии движения к цели
            this.state = 'moveToPoint';
            return; // Выходим, не меняя состояние
        }
        
        // Проверяем наличие хищников поблизости
        this.checkForPredators();
        
        // Приоритет: оборона > температура > голод > кормление животных > энергия > игра
        if (this.nearbyPredator && this.nearbyPredator.distance < 50) {
            // Хищник близко - обороняемся
            this.state = 'defend';
        } else if (this.temperature < 32) {
            // Критически холодно - ищем тепло
            this.state = 'findHeat';
        } else if (this.temperature < 35 && this.experience.fire_building > 0 && this.hasWoodForFire()) {
            // Холодно и есть навык разжигания костра и дрова - разводим костер автоматически
            this.state = 'buildFire';
        } else {
            const SEARCH_FOOD_THRESHOLD = window.GAME_CONFIG?.AGENTS?.HUNGER?.SEARCH_FOOD_THRESHOLD || 70;
            const STORE_FOOD_THRESHOLD = window.GAME_CONFIG?.AGENTS?.HUNGER?.STORE_FOOD_THRESHOLD || 50;
            
            if (this.hunger > SEARCH_FOOD_THRESHOLD) {
                this.state = 'findFood';
            } else if (this.hasHungryPets()) {
                // Есть голодные домашние животные
                this.state = 'feedAnimal';
            } else if (this.hunger < STORE_FOOD_THRESHOLD && this.foodStorage.length < 5) {
                // Запасаем еду
                this.state = 'storeFood';
            } else if (this.energy < 30) {
                this.state = 'rest';
            } else if (this.pets.length > 0 && Math.random() < 0.1) {
                // Иногда играем с домашними животными
                this.state = 'playWithPet';
            } else {
                this.state = 'explore';
            }
        }
        
        // Логирование смены состояния (только при изменении)
        if (oldState !== this.state && window.addLogEntry) {
            const stateNames = {
                'explore': 'исследует',
                'findFood': 'ищет еду',
                'rest': 'отдыхает',
                'findHeat': 'ищет источник тепла',
                'buildFire': 'разводит костер',
                'defend': 'обороняется',
                'feedAnimal': 'кормит животных',
                'playWithPet': 'играет с питомцем',
                'storeFood': 'запасает еду',
                'moveToPoint': 'движется к указанной точке'
            };
            window.addLogEntry(`${this.name} ${stateNames[this.state] || this.state}`);
        }
        
        this.act();
    }
    
    checkForPredators() {
        // Проверка наличия хищников поблизости
        this.nearbyPredator = null;
        if (!window.world || !window.world.predators) return;
        
        let minDistance = Infinity;
        window.world.predators.forEach(predator => {
            const distance = Math.sqrt(
                Math.pow(predator.x - this.position.x, 2) + 
                Math.pow(predator.y - this.position.y, 2)
            );
            if (distance < minDistance && distance < 100) {
                minDistance = distance;
                this.nearbyPredator = { predator, distance };
            }
        });
    }
    
    hasHungryPets() {
        // Проверяем, есть ли голодные домашние животные
        if (!window.world) return false;
        return this.pets.some(petId => {
            const pet = window.world.animals.find(a => a.id === petId);
            return pet && pet.hunger > 60;
        });
    }
    
    hasWoodForFire() {
        // Проверяем, есть ли дрова в инвентаре для костра
        const woodCount = this.inventory.filter(item => item.type === 'wood').length;
        return woodCount >= 3; // Нужно минимум 3 дрова для костра
    }

    act() {
        // Выполнение действий в зависимости от состояния
        switch(this.state) {
            case 'moveToPoint':
                // Движение к точке, указанной игроком - ПРИОРИТЕТ
                if (this.targetPosition) {
                    // Проверяем, что координаты валидны
                    if (typeof this.targetPosition.x === 'number' && typeof this.targetPosition.y === 'number' &&
                        !isNaN(this.targetPosition.x) && !isNaN(this.targetPosition.y)) {
                        this.moveTo(this.targetPosition.x, this.targetPosition.y);
                    } else {
                        console.error('Некорректные координаты цели:', this.targetPosition);
                        this.targetPosition = null;
                        this.isPlayerControlled = false;
                    }
                    return; // Выходим, не выполняя другие действия
                } else {
                    // Цель потеряна - очищаем флаг управления
                    this.isPlayerControlled = false;
                    this.state = 'explore';
                }
                // Если цель потеряна, переходим к обычному поведению
                break;
            case 'explore':
                this.moveToRandomPoint();
                this.scanForResources();
                break;
            case 'findFood':
                let foodLocation = this.memory.find(item => item.type === 'berry' || item.type === 'berries');
                if (foodLocation) {
                    this.moveTo(foodLocation.x, foodLocation.y);
                } else {
                    this.moveToRandomPoint();
                    this.scanForResources();
                }
                break;
            case 'findHeat':
                // Ищем ближайший костер
                const nearestFire = this.findNearestFire();
                if (nearestFire) {
                    this.moveTo(nearestFire.x, nearestFire.y);
                } else {
                    // Если нет костров, ищем дрова для разведения
                    if (this.canBuildFire) {
                        this.moveToRandomPoint();
                        this.scanForResources();
                    } else {
                        // Не можем развести костер - просто двигаемся
                        this.moveToRandomPoint();
                    }
                }
                break;
            case 'buildFire':
                // Разводим костер
                this.buildFire();
                break;
            case 'defend':
                // Оборона от хищника
                this.defendAgainstPredator();
                break;
            case 'feedAnimal':
                // Кормление домашних животных
                this.feedPets();
                break;
            case 'playWithPet':
                // Игра с домашним животным
                this.playWithPets();
                break;
            case 'storeFood':
                // Запасание еды
                this.storeFood();
                break;
            case 'rest':
                // Восстановление энергии на месте
                this.energy += 10;
                if (this.energy > this.maxEnergy) {
                    this.energy = this.maxEnergy;
                }
                break;
            case 'cook':
                // Готовка еды
                this.cook();
                break;
            case 'hunt':
                // Охота
                this.hunt();
                break;
            case 'build':
                // Строительство
                this.build();
                break;
            case 'fish':
                // Рыбалка
                this.fish();
                break;
            case 'farm':
                // Фермерство
                this.farm();
                break;
        }
    }
    
    cook() {
        // Готовка еды
        if (!window.world) return;
        
        // Нужны ингредиенты (мясо, рыба, ягоды)
        const ingredients = this.inventory.find(item => 
            ['meat', 'fish', 'bird', 'berries'].includes(item.type)
        );
        
        if (!ingredients) {
            // Нет ингредиентов - ищем их
            this.state = 'findFood';
            return;
        }
        
        // Готовим еду
        const cookedFood = {
            type: 'cooked_food',
            amount: 1
        };
        
        // Убираем ингредиент
        ingredients.amount--;
        if (ingredients.amount <= 0) {
            const index = this.inventory.indexOf(ingredients);
            if (index > -1) this.inventory.splice(index, 1);
        }
        
        // Добавляем готовую еду
        this.inventory.push(cookedFood);
        this.gainExperience('cooking', 2);
        
        if (window.addLogEntry && Math.random() < 0.3) {
            window.addLogEntry(`🍳 ${this.name} приготовил(а) еду`);
        }
        
        this.state = 'explore';
    }
    
    hunt() {
        // Охота
        if (!window.world || !window.world.animals) return;
        
        // Ищем диких животных (не прирученных)
        let target = null;
        let minDistance = Infinity;
        
        window.world.animals.forEach(animal => {
            if (animal.tamed || animal.owner) return; // Пропускаем домашних
            
            const dx = animal.x - this.position.x;
            const dy = animal.y - this.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 50 && distance < minDistance) {
                target = animal;
                minDistance = distance;
            }
        });
        
        if (target) {
            if (minDistance > 10) {
                // Идем к цели
                this.moveTo(target.x, target.y);
            } else {
                // Охотимся
                const success = Math.random() < 0.3 + this.experience.hunting / 100;
                if (success) {
                    // Успешная охота
                    this.inventory.push({ type: 'meat', amount: 1 });
                    this.gainExperience('hunting', 3);
                    
                    // Удаляем животное
                    const index = window.world.animals.indexOf(target);
                    if (index > -1) window.world.animals.splice(index, 1);
                    
                    if (window.addLogEntry) {
                        window.addLogEntry(`🎯 ${this.name} успешно охотится!`);
                    }
                } else {
                    if (window.addLogEntry && Math.random() < 0.2) {
                        window.addLogEntry(`🎯 ${this.name} промахнулся на охоте`);
                    }
                }
                this.state = 'explore';
            }
        } else {
            // Нет целей - ищем
            this.moveToRandomPoint();
        }
    }
    
    build() {
        // Строительство
        if (!window.world) return;
        
        // Нужны материалы (дерево, камень)
        const hasWood = this.inventory.some(item => item.type === 'wood');
        const hasStone = this.inventory.some(item => item.type === 'stone');
        
        if (!hasWood && !hasStone) {
            // Нет материалов - ищем
            this.state = 'findFood';
            return;
        }
        
        // Строим (упрощенная версия)
        if (hasWood) {
            const wood = this.inventory.find(item => item.type === 'wood');
            wood.amount--;
            if (wood.amount <= 0) {
                const index = this.inventory.indexOf(wood);
                if (index > -1) this.inventory.splice(index, 1);
            }
        }
        
        this.gainExperience('building', 2);
        
        if (window.addLogEntry && Math.random() < 0.3) {
            window.addLogEntry(`🏗️ ${this.name} строит`);
        }
        
        this.state = 'explore';
    }
    
    fish() {
        // Рыбалка
        if (!window.world) return;
        
        // Нужна удочка
        const hasRod = this.inventory.some(item => item.type === 'fishing_rod');
        if (!hasRod) {
            if (window.addLogEntry) {
                window.addLogEntry(`🎣 ${this.name} нужна удочка для рыбалки`);
            }
            this.state = 'explore';
            return;
        }
        
        // Ищем пруд
        if (window.world.terrain && window.world.terrain.pond) {
            const pond = window.world.terrain.pond;
            const dx = pond.centerX - this.position.x;
            const dy = pond.centerY - this.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > pond.radiusX + 20) {
                // Идем к пруду
                this.moveTo(pond.centerX, pond.centerY);
            } else {
                // Рыбачим
                const success = Math.random() < 0.4 + this.experience.fishing / 100;
                if (success) {
                    this.inventory.push({ type: 'fish', amount: 1 });
                    this.gainExperience('fishing', 2);
                    
                    if (window.addLogEntry && Math.random() < 0.3) {
                        window.addLogEntry(`🎣 ${this.name} поймал(а) рыбу!`);
                    }
                }
                this.state = 'explore';
            }
        } else {
            this.state = 'explore';
        }
    }
    
    farm() {
        // Фермерство
        if (!window.world || !window.world.animals) return;
        
        // Ищем домашних животных
        let farmAnimal = null;
        for (let petId of this.pets) {
            const pet = window.world.animals.find(a => a.id === petId);
            if (pet && (pet.type === 'cow' || pet.type === 'goat' || pet.type === 'sheep' || pet.type === 'chicken')) {
                farmAnimal = pet;
                break;
            }
        }
        
        if (!farmAnimal) {
            if (window.addLogEntry) {
                window.addLogEntry(`🌾 ${this.name} нужны домашние животные для фермерства`);
            }
            this.state = 'explore';
            return;
        }
        
        const dx = farmAnimal.x - this.position.x;
        const dy = farmAnimal.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 15) {
            // Идем к животному
            this.moveTo(farmAnimal.x, farmAnimal.y);
        } else {
            // Ухаживаем за животным
            farmAnimal.hunger = Math.max(0, farmAnimal.hunger - 20);
            this.gainExperience('farming', 1);
            
            // Иногда получаем продукт
            if (Math.random() < 0.2) {
                if (farmAnimal.type === 'chicken') {
                    this.inventory.push({ type: 'bird', amount: 1 });
                } else if (farmAnimal.type === 'cow' || farmAnimal.type === 'goat') {
                    // Можно добавить молоко
                }
            }
            
            if (window.addLogEntry && Math.random() < 0.2) {
                window.addLogEntry(`🌾 ${this.name} ухаживает за ${window.world.getAnimalName(farmAnimal.type)}`);
            }
            
            this.state = 'explore';
        }
    }
    
    defendAgainstPredator() {
        // Оборона от хищника
        if (!this.nearbyPredator) return;
        
        const predator = this.nearbyPredator.predator;
        const distance = this.nearbyPredator.distance;
        
        // Если хищник очень близко - отступаем
        if (distance < 30) {
            const dx = this.position.x - predator.x;
            const dy = this.position.y - predator.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                this.position.x += (dx / dist) * this.speed * 1.5; // Быстрее отступаем
                this.position.y += (dy / dist) * this.speed * 1.5;
            }
            
            // Увеличиваем опыт обороны
            this.defenseSkill += 0.5;
            this.gainExperience('hunting', 0.3); // Опыт охоты/обороны
            
            if (window.addLogEntry && Math.random() < 0.1) {
                window.addLogEntry(`⚔️ ${this.name} обороняется от хищника!`);
            }
        } else {
            // Держим дистанцию
            const dx = this.position.x - predator.x;
            const dy = this.position.y - predator.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0 && dist < 40) {
                this.position.x += (dx / dist) * this.speed;
                this.position.y += (dy / dist) * this.speed;
            }
        }
    }
    
    feedPets() {
        // Кормление домашних животных
        if (!window.world || this.pets.length === 0) return;
        
        // Ищем голодное животное
        let hungryPet = null;
        for (let petId of this.pets) {
            const pet = window.world.animals.find(a => a.id === petId);
            if (pet && pet.hunger > 60) {
                hungryPet = pet;
                break;
            }
        }
        
        if (!hungryPet) return;
        
        // Двигаемся к животному
        const dx = hungryPet.x - this.position.x;
        const dy = hungryPet.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 20) {
            this.moveTo(hungryPet.x, hungryPet.y);
        } else {
            // Кормим животное
            const food = this.animalFoodStorage.find(f => f.amount > 0);
            if (food) {
                hungryPet.hunger -= 30;
                if (hungryPet.hunger < 0) hungryPet.hunger = 0;
                food.amount--;
                if (food.amount <= 0) {
                    const index = this.animalFoodStorage.indexOf(food);
                    if (index > -1) this.animalFoodStorage.splice(index, 1);
                }
                
                this.gainExperience('farming', 0.5);
                
                if (window.addLogEntry && Math.random() < 0.3) {
                    window.addLogEntry(`🥕 ${this.name} кормит ${window.world.getAnimalName(hungryPet.type)}`);
                }
            } else {
                // Нет еды для животных - ищем
                this.state = 'findFood';
            }
        }
    }
    
    playWithPets() {
        // Игра с домашним животным
        if (!window.world || this.pets.length === 0) return;
        
        const petId = this.pets[Math.floor(Math.random() * this.pets.length)];
        const pet = window.world.animals.find(a => a.id === petId);
        
        if (!pet) return;
        
        // Двигаемся к животному
        const dx = pet.x - this.position.x;
        const dy = pet.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 25) {
            this.moveTo(pet.x, pet.y);
        } else {
            // Играем с животным
            this.mood = 'happy';
            this.energy += 5; // Игра восстанавливает энергию
            if (this.energy > this.maxEnergy) this.energy = this.maxEnergy;
            
            if (window.addLogEntry && Math.random() < 0.2) {
                window.addLogEntry(`🎮 ${this.name} играет с ${window.world.getAnimalName(pet.type)}`);
            }
        }
    }
    
    storeFood() {
        // Запасание еды
        // Ищем еду в инвентаре
        const foodItems = this.inventory.filter(item => 
            ['berries', 'cooked_food', 'meat', 'bird', 'fish'].includes(item.type)
        );
        
        if (foodItems.length > 0) {
            // Перемещаем еду в запасы (для себя и для животных)
            const food = foodItems[0];
            const index = this.inventory.indexOf(food);
            if (index > -1) {
                this.inventory.splice(index, 1);
                
                // Распределяем между запасами для себя и для животных
                if (this.pets.length > 0 && Math.random() < 0.5) {
                    // Часть еды для животных
                    this.animalFoodStorage.push({
                        type: food.type,
                        amount: food.amount || 1
                    });
                } else {
                    // Еда для себя
                    this.foodStorage.push({
                        type: food.type,
                        amount: food.amount || 1
                    });
                }
                
                if (window.addLogEntry && Math.random() < 0.2) {
                    window.addLogEntry(`📦 ${this.name} запасает еду`);
                }
            }
        } else {
            // Нет еды - ищем
            this.state = 'findFood';
        }
    }

    buildFire() {
        // Разведение костра (требуется навык fire_building)
        if (this.experience.fire_building <= 0) {
            if (window.addLogEntry) {
                window.addLogEntry(`❌ ${this.name} не умеет разжигать костер`);
            }
            this.state = 'explore';
            return;
        }
        
        if (!this.hasWoodForFire()) {
            if (window.addLogEntry) {
                window.addLogEntry(`❌ ${this.name} нет дров для костра`);
            }
            this.state = 'explore';
            return;
        }
        
        if (!window.world) return;
        
        // Проверяем, нет ли уже костра рядом
        const existingFire = window.world.fires.find(fire => {
            const distance = Math.sqrt(
                Math.pow(fire.x - this.position.x, 2) + 
                Math.pow(fire.y - this.position.y, 2)
            );
            return distance < 30; // Не разводим костер слишком близко к другому
        });
        
        if (existingFire) {
            // Уже есть костер рядом - можем добавить дров
            const woodItem = this.inventory.find(item => item.type === 'wood');
            if (woodItem && woodItem.amount > 0 && window.world.addWoodToFire) {
                window.world.addWoodToFire(existingFire.id, 1);
                woodItem.amount--;
                if (woodItem.amount <= 0) {
                    const index = this.inventory.indexOf(woodItem);
                    if (index > -1) this.inventory.splice(index, 1);
                }
                this.gainExperience('bring_wood', 0.5);
                if (window.addLogEntry) {
                    window.addLogEntry(`🔥 ${this.name} подбросил(а) дров в костер`);
                }
            }
            this.state = 'rest';
            return;
        }
        
        // Убираем дрова из инвентаря
        const woodNeeded = 2;
        let woodRemoved = 0;
        for (let i = this.inventory.length - 1; i >= 0 && woodRemoved < woodNeeded; i--) {
            if (this.inventory[i].type === 'wood') {
                const item = this.inventory[i];
                if (item.amount <= woodNeeded - woodRemoved) {
                    woodRemoved += item.amount;
                    this.inventory.splice(i, 1);
                } else {
                    item.amount -= (woodNeeded - woodRemoved);
                    woodRemoved = woodNeeded;
                }
            }
        }
        
        // Создаем костер
        if (window.world.addFire) {
            window.world.addFire(this.position.x, this.position.y, this.ownerId);
            this.gainExperience('fire_building', 2); // Опыт разжигания костра
            
            // Отправляем уведомление на сервер
            if (window.networkManager && window.networkManager.isConnected) {
                window.networkManager.buildFire(this.position.x, this.position.y);
            }
            
            if (window.addLogEntry) {
                window.addLogEntry(`🔥 ${this.name} развел костер в (${Math.floor(this.position.x)}, ${Math.floor(this.position.y)})`);
            }
        }
        
        // Переходим в состояние отдыха у костра
        this.state = 'rest';
    }

    moveTo(x, y) {
        // Движение к указанной точке
        const dx = x - this.position.x;
        const dy = y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Минимальное расстояние для остановки (чтобы не дрожал на месте)
        const minDistance = 2;
        
        if (distance > minDistance) {
            // Двигаемся в направлении цели
            const moveDistance = Math.min(distance, this.speed || 2);
            if (moveDistance > 0 && distance > 0) {
                this.position.x += (dx / distance) * moveDistance;
                this.position.y += (dy / distance) * moveDistance;
            }
        } else {
            // Достигли цели
            this.position.x = x;
            this.position.y = y;
            
            // Очищаем цель и возвращаем управление ИИ
            this.targetPosition = null;
            this.isPlayerControlled = false;
            
            // Сбрасываем состояние, чтобы ИИ мог принять новое решение
            this.state = 'explore';
            
            if (window.addLogEntry) {
                window.addLogEntry(`✅ ${this.name} достиг цели. Управление возвращено ИИ.`);
            }
        }
        
        // Бесконечный мир - не ограничиваем границами
        // Позиция может быть любой
    }
    
    // Установка цели для ручного управления
    setTarget(x, y) {
        this.targetPosition = { x, y };
        this.isPlayerControlled = true;
        // Переключаемся на состояние движения к цели
        this.state = 'moveToPoint';
        
        if (window.addLogEntry) {
            window.addLogEntry(`🎯 ${this.name} получил команду двигаться к (${Math.floor(x)}, ${Math.floor(y)}). ИИ отключен.`);
        }
    }
    
    // Очистка цели
    clearTarget() {
        this.targetPosition = null;
        this.isPlayerControlled = false;
    }

    moveToRandomPoint() {
        // Движение к случайной точке
        if (window.world && window.world.canvas) {
            const targetX = Math.random() * window.world.canvas.width;
            const targetY = Math.random() * window.world.canvas.height;
            this.moveTo(targetX, targetY);
        }
    }

    scanForResources() {
        // Сканирование ресурсов вокруг агента
        if (!window.world) return;
        
        const scanRadius = 50;
        const resources = window.world.resources;
        
        resources.forEach(resource => {
            const dx = resource.x - this.position.x;
            const dy = resource.y - this.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= scanRadius) {
                // Проверяем, нет ли уже этого ресурса в памяти
                const existingMemory = this.memory.find(m => 
                    Math.abs(m.x - resource.x) < 10 && 
                    Math.abs(m.y - resource.y) < 10 &&
                    m.type === resource.type
                );
                
                if (!existingMemory) {
                    // Добавляем в память
                    this.memory.push({
                        type: resource.type,
                        x: resource.x,
                        y: resource.y
                    });
                    
                    // Логирование обнаружения ресурса
                    if (window.addLogEntry && resource.type === 'berries') {
                        window.addLogEntry(`${this.name} заметил ягоды поблизости`);
                    }
                }
            }
        });
    }

    gainExperience(skill, amount = 1) {
        // Увеличение опыта в определенном навыке
        if (this.experience.hasOwnProperty(skill)) {
            this.experience[skill] += amount;
            // Ограничиваем максимальный опыт
            if (this.experience[skill] > 100) {
                this.experience[skill] = 100;
            }
        }
    }
    
    // Потребление еды с учетом её свойств
    consumeFood(foodType) {
        const FOOD_PROPERTIES = window.FOOD_PROPERTIES || {};
        const props = FOOD_PROPERTIES[foodType];
        
        if (!props) {
            // Если свойств нет - используем базовые значения
            this.hunger = Math.max(0, this.hunger - 20);
            this.energy = Math.min(100, this.energy + 10);
            return;
        }
        
        // Модификатор аппетита (чем выше аппетит, тем эффективнее еда)
        const appetiteModifier = 1 + (this.appetite - 50) / 100;
        
        // Применяем свойства еды
        if (props.hunger) {
            this.hunger = Math.max(0, this.hunger + props.hunger * appetiteModifier);
        }
        if (props.energy) {
            this.energy = Math.min(100, this.energy + props.energy * appetiteModifier);
        }
        if (props.health) {
            this.health = Math.min(100, this.health + props.health);
        }
        if (props.stamina) {
            this.stamina = Math.min(100, this.stamina + props.stamina);
        }
        if (props.immunity) {
            this.immunity = Math.min(100, this.immunity + props.immunity);
        }
        if (props.thirst) {
            this.thirst = Math.max(0, this.thirst + props.thirst);
        }
        if (props.sweetDesire) {
            this.sweetDesire = Math.max(0, this.sweetDesire + props.sweetDesire);
        }
        if (props.appetite) {
            this.appetite = Math.min(100, this.appetite + props.appetite);
        }
    }
    
    // Получить название еды
    getFoodName(foodType) {
        const foodNames = {
            'honey': 'Мёд',
            'milk': 'Молоко',
            'water': 'Вода',
            'bread': 'Хлеб',
            'kebab': 'Шашлык',
            'potato': 'Картофель',
            'salad': 'Салат',
            'mushrooms': 'Грибы',
            'tea': 'Чай',
            'banana': 'Банан',
            'orange': 'Апельсин',
            'apple': 'Яблоко',
            'lemon': 'Лимон',
            'rosehip': 'Шиповник',
            'cabbage': 'Капуста',
            'spices': 'Специи',
            'mint': 'Мята',
            'st_johns_wort': 'Зверобой',
            'berries': 'Ягоды',
            'meat': 'Мясо',
            'bird': 'Птица',
            'fish': 'Рыба',
            'cooked_food': 'Готовая еда'
        };
        return foodNames[foodType] || foodType;
    }

    interactWithWorld(world) {
        // Взаимодействие с миром - проверка ресурсов под ногами
        const resource = world.getResourceAt(this.position.x, this.position.y);
        
        if (resource) {
            // Проверяем, является ли ресурс едой
            const FOOD_PROPERTIES = window.FOOD_PROPERTIES || {};
            const foodProps = FOOD_PROPERTIES[resource.type];
            
            if (foodProps || resource.type === 'berries' || resource.type === 'berry') {
                // Это еда - добавляем в запасы или инвентарь (НЕ потребляем сразу)
                const foodType = resource.type === 'berry' ? 'berries' : resource.type;
                
                // Добавляем в инвентарь или запасы
                const foodItem = {
                    type: foodType,
                    amount: resource.amount || 1
                };
                
                // Если это полезная еда или специи - в инвентарь
                if (foodProps && (foodProps.category === 'HEALTHY' || foodProps.category === 'SPICES')) {
                    this.inventory.push(foodItem);
                } else {
                    // Остальная еда - в запасы
                    this.foodStorage.push(foodItem);
                }
                
                // Удаляем ресурс из мира
                const index = world.resources.indexOf(resource);
                if (index > -1) {
                    if (window.networkManager && window.networkManager.isConnected && resource.id) {
                        window.networkManager.removeResource(resource.id);
                    }
                    world.resources.splice(index, 1);
                }
                
                // Удаляем из памяти
                const memoryIndex = this.memory.findIndex(m => 
                    Math.abs(m.x - resource.x) < 10 && 
                    Math.abs(m.y - resource.y) < 10
                );
                if (memoryIndex > -1) {
                    this.memory.splice(memoryIndex, 1);
                }
                
                if (window.addLogEntry) {
                    window.addLogEntry(`${this.name} нашел и съел ${this.getFoodName(foodType)}`);
                }
            } else if (resource.type === 'wood') {
                // Собираем дрова
                this.inventory.push({
                    type: 'wood',
                    amount: resource.amount || 1
                });
                this.gainExperience('axe', 0.5); // Опыт при сборе дров
                
                // Удаляем ресурс из мира
                const index = world.resources.indexOf(resource);
                if (index > -1) {
                    // Отправляем уведомление на сервер
                    if (window.networkManager && window.networkManager.isConnected && resource.id) {
                        window.networkManager.removeResource(resource.id);
                    }
                    world.resources.splice(index, 1);
                }
                
                // Логирование
                if (window.addLogEntry) {
                    window.addLogEntry(`${this.name} собрал дрова (в инвентаре: ${this.inventory.filter(i => i.type === 'wood').length})`);
                }
            } else {
                // Обработка всех остальных ресурсов
                const resourceType = resource.type;
                
                // Инструменты
                if (['saw', 'axe', 'hammer', 'pickaxe', 'shovel', 'fishing_rod'].includes(resourceType)) {
                    this.inventory.push({ type: resourceType, amount: 1 });
                    const skillMap = {
                        'saw': 'saw',
                        'axe': 'axe',
                        'hammer': 'building',
                        'pickaxe': 'building',
                        'shovel': 'farming',
                        'fishing_rod': 'fishing'
                    };
                    if (skillMap[resourceType]) {
                        this.gainExperience(skillMap[resourceType], 1);
                    }
                    if (window.addLogEntry) {
                        window.addLogEntry(`${this.name} подобрал ${this.getResourceName(resourceType)}`);
                    }
                }
                // Одежда
                else if (['summer_clothes_man', 'summer_clothes_woman', 'winter_clothes_man', 'winter_clothes_woman'].includes(resourceType)) {
                    this.inventory.push({ type: resourceType, amount: 1 });
                    if (window.addLogEntry) {
                        window.addLogEntry(`${this.name} подобрал одежду`);
                    }
                }
                // Еда
                else if (['cooked_food', 'meat', 'bird', 'fish'].includes(resourceType)) {
                    this.inventory.push({ type: resourceType, amount: resource.amount || 1 });
                    this.hunger -= resourceType === 'cooked_food' ? 30 : 25;
                    if (this.hunger < 0) this.hunger = 0;
                    if (resourceType === 'cooked_food') {
                        this.gainExperience('cooking', 0.3);
                    }
                    if (window.addLogEntry) {
                        window.addLogEntry(`${this.name} подобрал ${this.getResourceName(resourceType)}`);
                    }
                }
                // Деньги
                else if (resourceType === 'money') {
                    this.inventory.push({ type: 'money', amount: resource.amount || 10 });
                    if (window.addLogEntry) {
                        window.addLogEntry(`${this.name} нашел деньги`);
                    }
                }
                
                // Удаляем ресурс из мира
                const index = world.resources.indexOf(resource);
                if (index > -1) {
                    // Отправляем уведомление на сервер
                    if (window.networkManager && window.networkManager.isConnected && resource.id) {
                        window.networkManager.removeResource(resource.id);
                    }
                    world.resources.splice(index, 1);
                }
            }
        }
    }
    
    getResourceName(type) {
        const names = {
            'saw': 'пилу',
            'axe': 'топор',
            'hammer': 'молоток',
            'pickaxe': 'кирку',
            'shovel': 'лопату',
            'fishing_rod': 'удочку',
            'cooked_food': 'готовую еду',
            'meat': 'мясо',
            'bird': 'птицу',
            'fish': 'рыбу',
            'money': 'деньги'
        };
        return names[type] || type;
    }

    // Методы для совместимости со старым кодом
    get x() {
        return this.position.x;
    }

    set x(value) {
        this.position.x = value;
    }

    get y() {
        return this.position.y;
    }

    set y(value) {
        this.position.y = value;
    }

    gatherResources() {
        // Собирать все ресурсы поблизости
        if (!window.world) return;
        
        const gatherRadius = 30;
        const resources = window.world.resources;
        let gathered = false;
        
        resources.forEach(resource => {
            const dx = resource.x - this.position.x;
            const dy = resource.y - this.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= gatherRadius) {
                gathered = true;
                
                // Собираем ресурс
                if (resource.type === 'fish') {
                    this.gainExperience('gather_fish', 1);
                } else if (resource.type === 'wood') {
                    this.gainExperience('gather_wood', 1);
                }
                this.gainExperience('gather_all', 0.5);
                
                // Добавляем в инвентарь
                const existingItem = this.inventory.find(item => item.type === resource.type);
                if (existingItem) {
                    existingItem.amount += resource.amount || 1;
                } else {
                    this.inventory.push({
                        type: resource.type,
                        amount: resource.amount || 1
                    });
                }
                
                // Удаляем ресурс
                const index = resources.indexOf(resource);
                if (index > -1) {
                    if (window.networkManager && window.networkManager.isConnected && resource.id) {
                        window.networkManager.removeResource(resource.id);
                    }
                    resources.splice(index, 1);
                }
            }
        });
        
        if (gathered && window.addLogEntry && Math.random() < 0.3) {
            window.addLogEntry(`🌿 ${this.name} собрал(а) ресурсы`);
        }
        
        this.state = 'explore';
    }
    
    getStateName() {
        if (this.health > 70) return 'Здоров';
        if (this.health > 40) return 'Ранен';
        return 'Болен';
    }

    getPsycheName() {
        if (this.panic) return 'Паника';
        if (this.fear > 70) return 'Сильный страх';
        if (this.fear > 40) return 'Страх';
        if (this.mood === 'neutral') return 'Спокоен';
        if (this.mood === 'anxious') return 'Напряжен';
        if (this.mood === 'happy') return 'Счастлив';
        return 'Грустен';
    }
}

// Дочерние классы

class YoungMan extends Agent {
    constructor(name, age, type, ownerId = null) {
        super(name, age, 'male', type, ownerId);
        this.energy = 100;
        this.maxEnergy = 100;
        this.speed = 3; // Быстрее двигается
        this.maxHealth = 100;
        // Молодые начинают с минимального опыта
        this.initializeExperience(0.1); // 10% от базового опыта
    }
    
    initializeExperience(multiplier) {
        // Инициализация опыта с множителем
        Object.keys(this.experience).forEach(key => {
            this.experience[key] = Math.floor(Math.random() * 10 * multiplier);
        });
    }
}

class OldMan extends Agent {
    constructor(name, age, type, ownerId = null) {
        super(name, age, 'male', type, ownerId);
        this.energy = 60; // Низкая базовая энергия
        this.maxEnergy = 60;
        this.speed = 1; // Медленнее двигается
        this.maxHealth = 80;
        this.canBuildFire = true; // Старик умеет разводить костер
        // Старики начинают с максимального опыта
        this.initializeExperience(1.5); // 150% от базового опыта
    }
    
    initializeExperience(multiplier) {
        // Инициализация опыта с множителем
        // Старики имеют высокий опыт во всех навыках
        Object.keys(this.experience).forEach(key => {
            // Базовый опыт 30-80, умноженный на множитель
            this.experience[key] = Math.floor(30 + Math.random() * 50 * multiplier);
            // Старики имеют особо высокий опыт в определенных навыках
            if (key === 'building' || key === 'farming' || key === 'cooking') {
                this.experience[key] = Math.floor(60 + Math.random() * 40 * multiplier);
            }
        });
    }

    update() {
        // Старик быстрее теряет здоровье
        super.update();
        if (this.hunger > 60) {
            this.health -= 0.8; // Больше теряет здоровье
        }
        // Старик быстрее замерзает
        if (this.temperature < 35) {
            this.temperature -= 0.1; // Теряет температуру быстрее
        }
    }
}

class YoungWoman extends Agent {
    constructor(name, age, type, ownerId = null) {
        super(name, age, 'female', type, ownerId);
        this.energy = 90;
        this.maxEnergy = 90;
        this.speed = 2.5; // Быстрее двигается
        this.maxHealth = 100;
        // Молодые начинают с минимального опыта
        this.initializeExperience(0.1); // 10% от базового опыта
    }
    
    initializeExperience(multiplier) {
        Object.keys(this.experience).forEach(key => {
            this.experience[key] = Math.floor(Math.random() * 10 * multiplier);
        });
    }
}

class OldWoman extends Agent {
    constructor(name, age, type, ownerId = null) {
        super(name, age, 'female', type, ownerId);
        this.energy = 55; // Низкая базовая энергия
        this.maxEnergy = 55;
        this.speed = 1; // Медленнее двигается
        this.maxHealth = 75;
        this.canBuildFire = true; // Старуха умеет разводить костер
        // Старухи начинают с максимального опыта
        this.initializeExperience(1.5); // 150% от базового опыта
    }
    
    initializeExperience(multiplier) {
        Object.keys(this.experience).forEach(key => {
            this.experience[key] = Math.floor(30 + Math.random() * 50 * multiplier);
        });
    }

    update() {
        // Старуха быстрее теряет здоровье
        super.update();
        if (this.hunger > 60) {
            this.health -= 0.9; // Больше теряет здоровье
        }
        // Старуха быстрее замерзает
        if (this.temperature < 35) {
            this.temperature -= 0.1; // Теряет температуру быстрее
        }
    }
}

// Класс для среднего возраста (для совместимости)
class MiddleAgedMan extends Agent {
    constructor(name, age, type, ownerId = null) {
        super(name, age, 'male', type, ownerId);
        this.energy = 85;
        this.maxEnergy = 85;
        this.speed = 2;
        this.maxHealth = 100;
        // Средний возраст - средний опыт
        this.initializeExperience(0.5); // 50% от базового опыта
    }
    
    initializeExperience(multiplier) {
        Object.keys(this.experience).forEach(key => {
            this.experience[key] = Math.floor(10 + Math.random() * 30 * multiplier);
        });
    }
}

class MiddleAgedWoman extends Agent {
    constructor(name, age, type, ownerId = null) {
        super(name, age, 'female', type, ownerId);
        this.energy = 80;
        this.maxEnergy = 80;
        this.speed = 2;
        this.maxHealth = 100;
        // Средний возраст - средний опыт
        this.initializeExperience(0.5); // 50% от базового опыта
    }
    
    initializeExperience(multiplier) {
        Object.keys(this.experience).forEach(key => {
            this.experience[key] = Math.floor(10 + Math.random() * 30 * multiplier);
        });
    }
}

class AgentsManager {
    constructor(playerId = null) {
        this.agents = [];
        this.playerId = playerId; // ID текущего игрока
        this.initializeAgents();
    }

    initializeAgents(playerId = null) {
        // Если передан playerId, создаем семью для этого игрока
        if (playerId) {
            this.playerId = playerId;
        }
        
        // Инициализация 6 агентов с использованием дочерних классов
        // Если есть playerId, все агенты принадлежат этому игроку
        this.agents = [
            new MiddleAgedMan('Мужчина', 35, 'man', this.playerId),
            new MiddleAgedWoman('Женщина', 32, 'woman', this.playerId),
            new YoungMan('Парень', 18, 'boy', this.playerId),
            new YoungWoman('Девушка', 17, 'girl', this.playerId),
            new OldMan('Старик', 68, 'oldman', this.playerId),
            new OldWoman('Старуха', 65, 'oldwoman', this.playerId)
        ];
    }
    
    // Получить агентов текущего игрока
    getPlayerAgents() {
        if (!this.playerId) return [];
        return this.agents.filter(agent => agent.ownerId === this.playerId);
    }
    
    // Получить агента по ID
    getAgentById(agentId) {
        return this.agents.find(agent => agent.id === agentId);
    }

    update() {
        // Обновление всех агентов
        this.agents.forEach(agent => {
            agent.update();
        });
    }

    getAgent(type) {
        return this.agents.find(agent => agent.type === type);
    }

    getAllAgents() {
        return this.agents;
    }

    reset() {
        this.initializeAgents();
        // Инициализация позиций агентов после сброса
        this.agents.forEach(agent => {
            agent.initializePosition();
        });
    }

    // Обновление UI агента
    updateAgentUI(agentType) {
        const agent = this.getAgent(agentType);
        if (!agent) return;

        const agentItem = document.querySelector(`[data-agent="${agentType}"]`).closest('.agent-item');
        if (agentItem) {
            const nameSpan = agentItem.querySelector('.agent-name');
            const ageSpan = agentItem.querySelector('.agent-age');
            const stateSelect = agentItem.querySelector('.agent-state');
            const psycheSelect = agentItem.querySelector('.agent-psyche');
            const energySlider = agentItem.querySelector('.agent-energy');
            const energyValue = agentItem.querySelector('.energy-value');
            const hungerSlider = agentItem.querySelector('.agent-hunger');
            const hungerValue = agentItem.querySelector('.hunger-value');
            const statusSpan = agentItem.querySelector('.agent-status');

            if (nameSpan) nameSpan.textContent = agent.name;
            if (ageSpan) ageSpan.textContent = agent.age;
            if (stateSelect) {
                // Обновляем состояние на основе здоровья
                const healthState = agent.health > 70 ? 'healthy' : 
                                  agent.health > 40 ? 'wounded' : 'sick';
                stateSelect.value = healthState;
            }
            if (psycheSelect) {
                // Обновляем психику на основе настроения
                const psycheState = agent.mood === 'neutral' ? 'calm' :
                                   agent.mood === 'anxious' ? 'tense' : 'panic';
                psycheSelect.value = psycheState;
            }
            if (energySlider) {
                energySlider.value = Math.floor(agent.energy);
                if (energyValue) energyValue.textContent = Math.floor(agent.energy);
            }
            if (hungerSlider) {
                hungerSlider.value = Math.floor(agent.hunger);
                if (hungerValue) hungerValue.textContent = Math.floor(agent.hunger);
            }
            if (statusSpan) statusSpan.textContent = agent.getStateName();
        }
    }

    // Обновление UI всех агентов
    updateAllAgentsUI() {
        this.agents.forEach(agent => {
            this.updateAgentUI(agent.type);
        });
    }
}

// Создание глобального экземпляра менеджера агентов
const agents = new AgentsManager();
window.agents = agents;
