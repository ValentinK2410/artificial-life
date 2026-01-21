// Основной файл для управления интерфейсом и симуляцией

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    initializeSimulationControls();
    initializeAgentAccordion();
    initializeWorldControls();
    initializeCanvas();
});

// Управление вкладками
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // Убираем активный класс со всех кнопок и панелей
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));

            // Добавляем активный класс к выбранной кнопке и панели
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });
}

// Управление контролами симуляции
function initializeSimulationControls() {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');

    // Обновление значения скорости
    speedSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        speedValue.textContent = value;
        // Здесь будет логика изменения скорости симуляции
        if (window.world) {
            world.setSimulationSpeed(parseInt(value));
        }
    });

    // Кнопки управления
    startBtn.addEventListener('click', () => {
        console.log('Симуляция запущена');
        if (window.world) {
            world.start();
        }
        addLogEntry('Симуляция запущена');
    });

    pauseBtn.addEventListener('click', () => {
        console.log('Симуляция приостановлена');
        if (window.world) {
            world.pause();
        }
        addLogEntry('Симуляция приостановлена');
    });

    resetBtn.addEventListener('click', () => {
        console.log('Симуляция сброшена');
        if (window.world) {
            world.reset();
        }
        if (window.agents) {
            agents.reset();
        }
        addLogEntry('Симуляция сброшена');
    });
}

// Управление аккордеоном агентов
function initializeAgentAccordion() {
    const agentHeaders = document.querySelectorAll('.agent-header');

    agentHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const agentItem = header.closest('.agent-item');
            const isActive = agentItem.classList.contains('active');

            // Закрываем все аккордеоны
            document.querySelectorAll('.agent-item').forEach(item => {
                item.classList.remove('active');
            });

            // Открываем выбранный, если он был закрыт
            if (!isActive) {
                agentItem.classList.add('active');
            }
        });
    });

    // Обновление значений ползунков энергии и голода
    document.querySelectorAll('.agent-energy, .agent-hunger').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const value = e.target.value;
            const valueSpan = e.target.parentElement.querySelector('.energy-value, .hunger-value');
            if (valueSpan) {
                valueSpan.textContent = value;
            }
        });
    });
}

// Управление контролами мира
function initializeWorldControls() {
    const weatherSelect = document.getElementById('weatherSelect');
    const addBerriesBtn = document.getElementById('addBerriesBtn');
    const addWoodBtn = document.getElementById('addWoodBtn');

    weatherSelect.addEventListener('change', (e) => {
        const weather = e.target.value;
        console.log('Погода изменена на:', weather);
        if (window.world) {
            world.setWeather(weather);
        }
        addLogEntry(`Погода изменена: ${getWeatherName(weather)}`);
    });

    addBerriesBtn.addEventListener('click', () => {
        console.log('Добавлены ягоды');
        if (window.world) {
            world.addResource('berries');
        }
        addLogEntry('Ягоды добавлены на карту');
    });

    addWoodBtn.addEventListener('click', () => {
        console.log('Добавлены дрова');
        if (window.world) {
            world.addResource('wood');
        }
        addLogEntry('Дрова добавлены на карту');
    });
}

// Получение названия погоды
function getWeatherName(weather) {
    const names = {
        'sunny': 'Солнечно',
        'rain': 'Дождь',
        'night': 'Ночь'
    };
    return names[weather] || weather;
}

// Инициализация canvas
function initializeCanvas() {
    const canvas = document.getElementById('worldCanvas');
    if (canvas) {
        // Устанавливаем размер canvas на весь контейнер
        const resizeCanvas = () => {
            const container = canvas.parentElement;
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Инициализация отрисовки
        if (window.world) {
            world.initializeCanvas(canvas);
        }
    }
}

// Функция для добавления записей в лог
function addLogEntry(message) {
    const logContainer = document.getElementById('log');
    if (logContainer) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        
        const time = new Date().toLocaleTimeString('ru-RU');
        entry.innerHTML = `<span class="log-time">[${time}]</span><span class="log-message">${message}</span>`;
        
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }
}

// Экспорт функций для использования в других модулях
window.addLogEntry = addLogEntry;
