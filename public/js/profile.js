class ProfileManager {
  constructor() {
    this.loadProfile();
    this.initEventListeners();
  }

  async loadProfile() {
    try {
      const response = await fetch('/api/profile');
      
      if (response.status === 401) {
        window.location.href = '/';
        return;
      }

      const data = await response.json();

      if (data.success) {
        this.displayProfile(data.profile);
        this.loadCharacters();
      } else {
        this.showError('Ошибка загрузки профиля');
      }
    } catch (error) {
      console.error('Profile load error:', error);
      this.showError('Ошибка соединения с сервером');
    }
  }

  displayProfile(profile) {
    // Основная информация
    document.getElementById('profileUsername').textContent = profile.username;
    document.getElementById('profileEmail').textContent = profile.email;
    document.getElementById('accountId').textContent = profile.accountId;
    document.getElementById('accountType').textContent = profile.accountType;
    document.getElementById('accountTypeBadge').textContent = profile.accountType;
    document.getElementById('loginCount').textContent = profile.logincount;
    document.getElementById('lastLogin').textContent = this.formatDate(profile.lastLogin);
    document.getElementById('lastIp').textContent = profile.lastIp || 'Неизвестно';
    document.getElementById('characterSlots').textContent = profile.characterSlots;
  }

  async loadCharacters() {
    try {
      const response = await fetch('/api/character/my-characters');
      const data = await response.json();

      if (data.success) {
        this.displayCharacters(data.characters);
      } else {
        this.showError('Ошибка загрузки персонажей');
      }
    } catch (error) {
      console.error('Characters load error:', error);
      this.showError('Ошибка загрузки персонажей');
    }
  }

  displayCharacters(characters) {
    const container = document.getElementById('charactersList');
    
    if (characters.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center">
          <div class="alert alert-info">
            <i class="bi bi-info-circle"></i> У вас пока нет персонажей
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = characters.map(char => `
      <div class="col-md-6">
        <div class="card character-card position-relative">
          ${char.online ? '<span class="badge bg-success online-badge">Online</span>' : ''}
          <div class="card-body">
            <h6 class="card-title">${char.name}</h6>
            <div class="row small text-muted">
              <div class="col-6">Уровень:</div>
              <div class="col-6 text-end">${char.base_level}/${char.job_level}</div>
              <div class="col-6">Класс:</div>
              <div class="col-6 text-end">${this.getClassname(char.class)}</div>
              <div class="col-6">Зени:</div>
              <div class="col-6 text-end">${this.formatZeny(char.zeny)}</div>
              <div class="col-6">Карта:</div>
              <div class="col-6 text-end">${char.last_map}</div>
            </div>
          </div>
        </div>
      </div>
    `).join('');
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

  formatDate(dateString) {
    if (!dateString) return 'Никогда';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
  }

  initEventListeners() {
    // Обработчик формы смены email
    document.getElementById('emailForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.updateEmail();
    });

    // Обработчик формы создания персонажа
    document.getElementById('createCharForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.createCharacter();
    });
  }

  async updateEmail() {
    const form = document.getElementById('emailForm');
    const errorDiv = document.getElementById('emailError');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    const newEmail = document.getElementById('newEmail').value;

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Сохранение...';
      errorDiv.classList.add('d-none');

      const response = await fetch('/api/profile/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newEmail })
      });

      const data = await response.json();

      if (data.success) {
        window.ToastManager.showSuccess(data.message);
        form.reset();
        
        // Обновляем email в профиле
        document.getElementById('profileEmail').textContent = newEmail;
        
        // Закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('emailModal'));
        modal.hide();
      } else {
        errorDiv.textContent = data.message;
        errorDiv.classList.remove('d-none');
        window.ToastManager.showError(data.message);
      }

    } catch (error) {
      console.error('Email update error:', error);
      errorDiv.textContent = 'Ошибка соединения с сервером';
      errorDiv.classList.remove('d-none');
      window.ToastManager.showError('Ошибка соединения с сервером');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Сохранить';
    }
  }

  async createCharacter() {
    const form = document.getElementById('createCharForm');
    const errorDiv = document.getElementById('createCharError');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    const charName = document.getElementById('charName').value;
    const charClass = document.querySelector('input[name="charClass"]:checked').value;

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Создание...';
      errorDiv.classList.add('d-none');

      const response = await fetch('/api/character/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          charName: charName,
          charClass: parseInt(charClass)
        })
      });

      const data = await response.json();

      if (data.success) {
        window.ToastManager.showSuccess(data.message);
        form.reset();
        
        // Закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('createCharModal'));
        modal.hide();
        
        // Обновляем список персонажей
        this.loadCharacters();
      } else {
        errorDiv.textContent = data.message;
        errorDiv.classList.remove('d-none');
        window.ToastManager.showError(data.message);
      }

    } catch (error) {
      console.error('Character creation error:', error);
      errorDiv.textContent = 'Ошибка соединения с сервером';
      errorDiv.classList.remove('d-none');
      window.ToastManager.showError('Ошибка соединения с сервером');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Создать персонажа';
    }
  }

  showError(message) {
    const container = document.querySelector('.container');
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-dismissible fade show';
    alert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    container.prepend(alert);
  }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  new ProfileManager();
});