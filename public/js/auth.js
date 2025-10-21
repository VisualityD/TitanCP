class AuthManager {
  constructor() {
    this.checkAuthStatus();
    this.initEventListeners();
  }

  async checkAuthStatus() {
    try {
      const response = await fetch('/api/auth/check');
      const data = await response.json();
      
      if (data.authenticated) {
        this.showUserMenu(data.user);
      } else {
        this.showGuestMenu();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  }

  showUserMenu(user) {
    const navButtons = document.querySelector('.navbar .d-flex');
    
    let accountType = 'Игрок';
    if (user.groupId === 99) accountType = 'Администратор';
    
    navButtons.innerHTML = `
      <div class="dropdown">
        <button class="btn btn-outline-light dropdown-toggle" type="button" data-bs-toggle="dropdown">
          <i class="bi bi-person-circle"></i> ${user.username}
        </button>
        <ul class="dropdown-menu">
          <li><span class="dropdown-item-text small">Тип: ${accountType}</span></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item" href="/profile.html"><i class="bi bi-person"></i> Личный кабинет</a></li>
          <li><a class="dropdown-item" href="#" id="logoutBtn"><i class="bi bi-box-arrow-right"></i> Выйти</a></li>
        </ul>
      </div>
    `;

    // Добавляем обработчик для выхода
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
      e.preventDefault();
      this.logout();
    });
  }

  showGuestMenu() {
    const navButtons = document.querySelector('.navbar .d-flex');
    navButtons.innerHTML = `
      <button class="btn btn-outline-light me-2" data-bs-toggle="modal" data-bs-target="#loginModal">Вход</button>
      <button class="btn btn-danger" data-bs-toggle="modal" data-bs-target="#registerModal">Регистрация</button>
    `;
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
        this.showNotification('Авторизация успешна!', 'success');
        
        // Обновляем меню
        this.checkAuthStatus();
        
        // Очищаем форму
        form.reset();
      } else {
        errorDiv.textContent = data.message;
        errorDiv.classList.remove('d-none');
      }

    } catch (error) {
      console.error('Login error:', error);
      errorDiv.textContent = 'Ошибка соединения с сервером';
      errorDiv.classList.remove('d-none');
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
    const email = document.getElementById('regEmail').value;
    const sex = document.querySelector('input[name="regSex"]:checked').value;

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
        this.showNotification('Регистрация успешна! Добро пожаловать!', 'success');
        
        // Обновляем меню
        this.checkAuthStatus();
        
        // Очищаем форму
        form.reset();
      } else {
        errorDiv.textContent = data.message;
        errorDiv.classList.remove('d-none');
      }

    } catch (error) {
      console.error('Registration error:', error);
      errorDiv.textContent = 'Ошибка соединения с сервером';
      errorDiv.classList.remove('d-none');
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
        this.showNotification('Выход выполнен успешно', 'info');
        this.checkAuthStatus();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  showNotification(message, type = 'info') {
    // Создаем уведомление (можно заменить на toast из Bootstrap)
    alert(message); // Временное решение - можно реализовать красивые уведомления
  }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  new AuthManager();
});