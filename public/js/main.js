// Toast notification system
class ToastManager {
    static showSuccess(message) {
        const toastEl = document.getElementById('successToast');
        const toastMessage = document.getElementById('successMessage');
        
        toastMessage.textContent = message;
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }

    static showError(message) {
        const toastEl = document.getElementById('errorToast');
        const toastMessage = document.getElementById('errorMessage');
        
        toastMessage.textContent = message;
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }

    static showInfo(message) {
        const toastEl = document.getElementById('infoToast');
        const toastMessage = document.getElementById('infoMessage');
        
        toastMessage.textContent = message;
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }
}

// Auth manager with toast notifications
class AuthManager {
    constructor() {
        this.initEventListeners();
    }

    initEventListeners() {
        // Обработчик формы входа
        document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.login();
        });

        // Обработчик формы регистрации
        document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.register();
        });

        // Обработчик выхода
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }

    async login() {
        const form = document.getElementById('loginForm');
        const errorDiv = document.getElementById('loginError');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Вход...';
            errorDiv.classList.add('d-none');

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                // Закрываем модальное окно
                const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                modal.hide();
                
                // Показываем уведомление об успехе
                ToastManager.showSuccess('Авторизация успешна!');
                
                // Обновляем страницу чтобы применить изменения EJS
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
                
                // Очищаем форму
                form.reset();
            } else {
                errorDiv.textContent = data.message;
                errorDiv.classList.remove('d-none');
                ToastManager.showError(data.message);
            }

        } catch (error) {
            console.error('Login error:', error);
            errorDiv.textContent = 'Ошибка соединения с сервером';
            errorDiv.classList.remove('d-none');
            ToastManager.showError('Ошибка соединения с сервером');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Войти';
        }
    }

    async register() {
        const form = document.getElementById('registerForm');
        const errorDiv = document.getElementById('registerError');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;
        const passwordConfirm = document.getElementById('regPasswordConfirm').value;
        const email = document.getElementById('regEmail').value;
        const sex = document.querySelector('input[name="regSex"]:checked').value;

        // Проверка подтверждения пароля
        if (password !== passwordConfirm) {
            errorDiv.textContent = 'Пароли не совпадают';
            errorDiv.classList.remove('d-none');
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Регистрация...';
            errorDiv.classList.add('d-none');

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password, email, sex })
            });

            const data = await response.json();

            if (data.success) {
                // Закрываем модальное окно
                const modal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
                modal.hide();
                
                // Показываем уведомление об успехе
                ToastManager.showSuccess('Регистрация успешна! Добро пожаловать!');
                
                // Обновляем страницу чтобы применить изменения EJS
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
                
                // Очищаем форму
                form.reset();
            } else {
                errorDiv.textContent = data.message;
                errorDiv.classList.remove('d-none');
                ToastManager.showError(data.message);
            }

        } catch (error) {
            console.error('Registration error:', error);
            errorDiv.textContent = 'Ошибка соединения с сервером';
            errorDiv.classList.remove('d-none');
            ToastManager.showError('Ошибка соединения с сервером');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Зарегистрироваться';
        }
    }

    async logout() {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST'
            });

            const data = await response.json();

            if (data.success) {
                ToastManager.showInfo('Выход выполнен успешно');
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            }
        } catch (error) {
            console.error('Logout error:', error);
            ToastManager.showError('Ошибка при выходе');
        }
    }
}

// Server status updater
class ServerStatus {
    static async updateStatus() {
        try {
            const response = await fetch('/api/server-status');
            const data = await response.json();
            
            const onlineCount = document.getElementById('onlineCount');
            if (onlineCount) {
                onlineCount.textContent = data.online;
            }
        } catch (error) {
            console.error('Failed to update server status:', error);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
    
    // Обновляем статус сервера каждые 30 секунд
    ServerStatus.updateStatus();
    setInterval(ServerStatus.updateStatus, 30000);
});

// Global access to ToastManager
window.ToastManager = ToastManager;
window.AuthManager = AuthManager;