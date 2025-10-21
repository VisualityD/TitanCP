class AdminPanel {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadDashboard();
        await this.loadSiteSettings();
        await this.loadUsers();
        this.initEventListeners();
    }

    async loadDashboard() {
        try {
            // Статистика загружается с сервера при рендеринге страницы
            document.getElementById('totalUsers').textContent = document.getElementById('totalUsers').dataset.count || '0';
            document.getElementById('totalChars').textContent = document.getElementById('totalChars').dataset.count || '0';
            document.getElementById('onlineChars').textContent = document.getElementById('onlineChars').dataset.count || '0';
        } catch (error) {
            console.error('Dashboard load error:', error);
        }
    }

    async loadSiteSettings() {
        try {
            const response = await fetch('/api/admin/site-settings');
            const data = await response.json();

            if (data.success) {
                const form = document.getElementById('siteSettingsForm');
                Object.entries(data.settings).forEach(([key, value]) => {
                    const input = form.querySelector(`[name="${key}"]`);
                    if (input) {
                        input.value = value;
                    }
                });
            }
        } catch (error) {
            console.error('Site settings load error:', error);
        }
    }

    async loadUsers() {
        try {
            const response = await fetch('/api/admin/users');
            const data = await response.json();

            if (data.success) {
                this.renderUsersTable(data.users);
            }
        } catch (error) {
            console.error('Users load error:', error);
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.account_id}</td>
                <td>${user.userid}</td>
                <td>${user.email}</td>
                <td>${user.sex === 'M' ? 'Мужской' : 'Женский'}</td>
                <td>
                    ${user.group_id === 99 ? 
                        '<span class="badge bg-danger">Админ</span>' : 
                        '<span class="badge bg-secondary">Пользователь</span>'
                    }
                </td>
                <td>
                    ${user.state === 0 ? 
                        '<span class="badge bg-success">Активен</span>' : 
                        '<span class="badge bg-danger">Заблокирован</span>'
                    }
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="adminPanel.viewUserCharacters(${user.account_id}, '${user.userid}')">
                        <i class="bi bi-people"></i>
                    </button>
                    ${user.state === 0 ? 
                        `<button class="btn btn-sm btn-outline-danger" onclick="adminPanel.banUser(${user.account_id}, true)">
                            <i class="bi bi-lock"></i>
                        </button>` :
                        `<button class="btn btn-sm btn-outline-success" onclick="adminPanel.banUser(${user.account_id}, false)">
                            <i class="bi bi-unlock"></i>
                        </button>`
                    }
                </td>
            </tr>
        `).join('');
    }

    async viewUserCharacters(accountId, username) {
        try {
            const response = await fetch(`/api/admin/users/${accountId}/characters`);
            const data = await response.json();

            if (data.success) {
                const modal = document.getElementById('userCharactersModal');
                const charactersList = document.getElementById('userCharactersList');
                
                if (data.characters.length === 0) {
                    charactersList.innerHTML = '<p class="text-center">Нет персонажей</p>';
                } else {
                    charactersList.innerHTML = data.characters.map(char => `
                        <div class="card mb-2">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="mb-1">${char.name}</h6>
                                        <small class="text-muted">
                                            Уровень: ${char.base_level}/${char.job_level} | 
                                            Класс: ${this.getClassname(char.class)} |
                                            Зени: ${this.formatZeny(char.zeny)}
                                        </small>
                                    </div>
                                    ${char.online ? 
                                        '<span class="badge bg-success">Online</span>' : 
                                        '<span class="badge bg-secondary">Offline</span>'
                                    }
                                </div>
                            </div>
                        </div>
                    `).join('');
                }

                // Обновляем заголовок модального окна
                modal.querySelector('.modal-title').textContent = `Персонажи пользователя: ${username}`;
                
                new bootstrap.Modal(modal).show();
            }
        } catch (error) {
            console.error('View user characters error:', error);
            window.ToastManager.showError('Ошибка при загрузке персонажей');
        }
    }

    async banUser(accountId, ban) {
        try {
            const response = await fetch(`/api/admin/users/${accountId}/ban`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ banned: ban })
            });

            const data = await response.json();

            if (data.success) {
                window.ToastManager.showSuccess(data.message);
                await this.loadUsers(); // Перезагружаем список пользователей
            } else {
                window.ToastManager.showError(data.message);
            }
        } catch (error) {
            console.error('Ban user error:', error);
            window.ToastManager.showError('Ошибка при изменении статуса пользователя');
        }
    }

    initEventListeners() {
        // Форма настроек сайта
        document.getElementById('siteSettingsForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveSiteSettings();
        });

        // Форма создания персонажа
        document.getElementById('createCharForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createCharacter();
        });
    }

    async saveSiteSettings() {
        const form = document.getElementById('siteSettingsForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Сохранение...';

            const formData = new FormData(form);
            const settings = {};
            
            for (const [key, value] of formData.entries()) {
                settings[key] = value;
            }

            const response = await fetch('/api/admin/site-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ settings })
            });

            const data = await response.json();

            if (data.success) {
                window.ToastManager.showSuccess(data.message);
            } else {
                window.ToastManager.showError(data.message);
            }

        } catch (error) {
            console.error('Save site settings error:', error);
            window.ToastManager.showError('Ошибка при сохранении настроек');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Сохранить настройки';
        }
    }

    async createCharacter() {
        const form = document.getElementById('createCharForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        const accountId = document.getElementById('adminAccountId').value;
        const charName = document.getElementById('adminCharName').value;
        const charClass = document.getElementById('adminCharClass').value;

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Создание...';

            const response = await fetch('/api/admin/characters/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    accountId: parseInt(accountId),
                    charName: charName,
                    charClass: parseInt(charClass)
                })
            });

            const data = await response.json();

            if (data.success) {
                window.ToastManager.showSuccess(data.message);
                form.reset();
            } else {
                window.ToastManager.showError(data.message);
            }

        } catch (error) {
            console.error('Create character error:', error);
            window.ToastManager.showError('Ошибка при создании персонажа');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Создать персонажа';
        }
    }

    getClassname(classId) {
        const classes = {
            0: 'Новичок',
            1: 'Мечник',
            2: 'Волшебник',
            3: 'Лучник',
            4: 'Торговец',
            5: 'Вор',
            6: 'Аколыт',
            7: 'Супер-новичок'
        };
        return classes[classId] || `Класс ${classId}`;
    }

    formatZeny(zeny) {
        return new Intl.NumberFormat('ru-RU').format(zeny);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});