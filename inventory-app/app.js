// Инвентарь сталкера - Mini App
// Подключаем VK Bridge
vkBridge.send('VKWebAppInit');

// Настройки API - ИЗМЕНИ ЭТО НА СВОЙ ДОМЕН
const API_BASE = 'http://localhost:5000';  // Замени на реальный адрес после деплоя

// Состояние приложения
let playerData = {
    vk_id: null,
    name: 'Сталкер',
    money: 100,
    health: 100,
    attack: 10,
    defense: 0,
    fatigue: 0,
    inventory: {
        weapons: [],
        armor: [],
        consumables: []
    }
};

// Тестовые данные (если API недоступен)
const testInventory = {
    weapons: [
        { id: 'pm', name: '🔫 ПМ', icon: '🔫', damage: 15, count: 1 },
        { id: 'ak74', name: '🔫 АК-74', icon: '🔫', damage: 40, count: 1 }
    ],
    armor: [
        { id: 'vest', name: '🦺 Бронежилет', icon: '🦺', defense: 20, count: 1 }
    ],
    consumables: [
        { id: 'medkit', name: '💊 Аптечка', icon: '💊', heal: 60, count: 3 },
        { id: 'energy_drink', name: '⚡ Энергетик', icon: '⚡', energy: 20, count: 5 }
    ]
};

// Инициализация приложения
async function init() {
    try {
        // Получаем ID пользователя из VK
        const userData = await vkBridge.send('VKWebAppGetUserInfo');
        playerData.vk_id = userData.id;
        playerData.name = userData.first_name;
        
        // Загружаем данные инвентаря
        await loadInventory();
        
        // Обновляем UI
        updatePlayerInfo();
        renderInventory();
        
    } catch (error) {
        console.log('Ошибка инициализации:', error);
        // Используем тестовые данные
        playerData.inventory = testInventory;
        updatePlayerInfo();
        renderInventory();
    }
}

// Загрузка инвентаря с сервера
async function loadInventory() {
    try {
        const response = await fetch(`${API_BASE}/api/inventory/${playerData.vk_id}`);

        if (!response.ok) {
            throw new Error('API error');
        }

        const data = await response.json();

        playerData.name = data.player.name;
        playerData.money = data.player.money;
        playerData.health = data.player.health;
        playerData.attack = data.player.attack;
        playerData.fatigue = data.player.fatigue;
        playerData.inventory = data.inventory;

    } catch (error) {
        console.log('Не удалось загрузить с API, используем тестовые данные:', error);
        playerData.inventory = testInventory;
    }
}

// Обновление информации об игроке
function updatePlayerInfo() {
    document.getElementById('player-name').textContent = playerData.name;
    document.getElementById('player-money').textContent = playerData.money;
    document.getElementById('stat-health').textContent = playerData.health;
    document.getElementById('stat-attack').textContent = playerData.attack;
    document.getElementById('stat-defense').textContent = playerData.defense;
    document.getElementById('stat-fatigue').textContent = playerData.fatigue;
}

// Отрисовка инвентаря
function renderInventory() {
    renderCategory('weapons', playerData.inventory.weapons);
    renderCategory('armor', playerData.inventory.armor);
    renderCategory('consumables', playerData.inventory.consumables);
}

function renderCategory(categoryId, items) {
    const grid = document.getElementById(`${categoryId}-grid`);
    
    if (!items || items.length === 0) {
        grid.innerHTML = `
            <div class="empty-inventory">
                <span>📦</span>
                <p>Пусто</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = items.map(item => {
        let statsHtml = '';
        if (item.damage) statsHtml = `<span>⚔️ ${item.damage}</span>`;
        if (item.defense) statsHtml = `<span>🛡️ ${item.defense}</span>`;
        if (item.heal) statsHtml = `<span>❤️ +${item.heal}</span>`;
        if (item.energy) statsHtml = `<span>⚡ +${item.energy}</span>`;
        
        return `
            <div class="item-card" onclick="openUseModal('${categoryId}', '${item.id}')">
                <div class="item-icon">${item.icon}</div>
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-stats">${statsHtml}</div>
                </div>
                <div class="item-count">x${item.count}</div>
            </div>
        `;
    }).join('');
}

// Модальное окно
let selectedItem = null;
let selectedCategory = null;

function openUseModal(category, itemId) {
    selectedCategory = category;
    selectedItem = playerData.inventory[category].find(i => i.id === itemId);
    
    if (!selectedItem) return;
    
    let description = '';
    if (selectedItem.damage) description = `Урон: ${selectedItem.damage}`;
    if (selectedItem.defense) description = `Защита: ${selectedItem.defense}`;
    if (selectedItem.heal) description = `Лечит: +${selectedItem.heal} HP`;
    if (selectedItem.energy) description = `Энергия: +${selectedItem.energy}`;
    
    document.getElementById('modal-title').textContent = `Использовать ${selectedItem.name}?`;
    document.getElementById('modal-description').textContent = description;
    document.getElementById('use-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('use-modal').classList.add('hidden');
    selectedItem = null;
    selectedCategory = null;
}

// Использование предмета
async function useItem() {
    if (!selectedItem || !selectedCategory) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/use_item`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                vk_id: playerData.vk_id,
                item_id: selectedItem.id
            })
        });

        if (response.ok) {
            // Перезагружаем данные
            await loadInventory();
            updatePlayerInfo();
            renderInventory();
        } else {
            const error = await response.json();
            alert(error.error || 'Ошибка использования');
        }

    } catch (error) {
        console.log('Ошибка API:', error);
        // Локальное использование (для теста)
        if (selectedItem.count > 1) {
            selectedItem.count--;
        } else {
            playerData.inventory[selectedCategory] = playerData.inventory[selectedCategory].filter(
                i => i.id !== selectedItem.id
            );
        }

        // Применяем эффект локально
        if (selectedItem.heal) {
            playerData.health = Math.min(100, playerData.health + selectedItem.heal);
        }
        if (selectedItem.energy) {
            playerData.fatigue = Math.max(0, playerData.fatigue - selectedItem.energy);
        }

        updatePlayerInfo();
        renderInventory();
    }

    closeModal();
    
    // Закрываем Mini App после использования
    setTimeout(() => {
        vkBridge.send('VKWebAppClose', { success: true });
    }, 500);
}

// Обработчики событий
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Убираем активный класс у всех вкладок
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Добавляем активный класс выбранной вкладке
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

document.getElementById('close-modal').addEventListener('click', closeModal);
document.getElementById('use-btn').addEventListener('click', useItem);

// Запуск
init();
