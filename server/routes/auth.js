const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');
const router = express.Router();

// Регистрация
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, sex = 'M' } = req.body;

    console.log('📝 Registration attempt:', { username, email, sex });

    // Проверка входных данных
    if (!username || !password || !email) {
      return res.status(400).json({
        success: false,
        message: 'Все поля обязательны для заполнения'
      });
    }

    // Проверка длины
    if (username.length < 4 || username.length > 23) {
      return res.status(400).json({
        success: false,
        message: 'Логин должен быть от 4 до 23 символов'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Пароль должен быть не менее 6 символов'
      });
    }

    // Проверка существования пользователя
    const [existingUsers] = await db.query(
      'SELECT account_id FROM login WHERE userid = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь с таким логином или email уже существует'
      });
    }

    // Хеширование пароля с bcrypt
    const hashedPassword = bcrypt.hashSync(password, 10);
    console.log('🔐 Password hashed with bcrypt, length:', hashedPassword.length);

    // Создание аккаунта - убрали поле birthdate
    const [result] = await db.query(
      `INSERT INTO login (userid, user_pass, sex, email, group_id, state, 
       lastlogin, last_ip, character_slots) 
       VALUES (?, ?, ?, ?, 0, 0, NOW(), ?, 9)`,
      [username, hashedPassword, sex, email, req.ip]
    );

    console.log('✅ User registered successfully, ID:', result.insertId);

    req.session.userId = result.insertId;
    req.session.username = username;
    req.session.groupId = 0;

    res.json({
      success: true,
      message: 'Аккаунт успешно создан',
      user: {
        id: result.insertId,
        username: username,
        email: email
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error.message);
    console.error('🔍 Error details:', error);
    
    let errorMessage = 'Ошибка сервера при регистрации';
    
    if (error.code === 'ER_DATA_TOO_LONG') {
      errorMessage = 'Ошибка: данные слишком длинные. Проверьте длину полей.';
    } else if (error.errno === 1062) {
      errorMessage = 'Пользователь с таким логином или email уже существует';
    } else if (error.code === 'ER_BAD_FIELD_ERROR') {
      errorMessage = 'Ошибка структуры базы данных. Попробуйте пересоздать базу данных.';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
});

// Авторизация
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('🔐 Login attempt for user:', username);

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Логин и пароль обязательны'
      });
    }

    // Поиск пользователя
    const [users] = await db.query(
      `SELECT account_id, userid, user_pass, email, sex, group_id, 
       logincount, lastlogin, last_ip, state, unban_time, vip_time 
       FROM login WHERE userid = ?`,
      [username]
    );

    if (users.length === 0) {
      console.log('❌ User not found:', username);
      return res.status(401).json({
        success: false,
        message: 'Неверный логин или пароль'
      });
    }

    const user = users[0];
    console.log('👤 User found:', user.userid);
    console.log('🔑 Stored password length:', user.user_pass.length);

    // Проверка бана
    if (user.state > 0) {
      return res.status(403).json({
        success: false,
        message: 'Аккаунт заблокирован'
      });
    }

    // Умная проверка пароля
    let validPassword = false;
    
    // Проверяем формат пароля
    if (user.user_pass.length === 32) {
      // MD5 hash (32 characters)
      const md5Hash = crypto.createHash('md5').update(password).digest('hex');
      validPassword = (md5Hash === user.user_pass);
      console.log('🔍 MD5 password check:', validPassword ? 'VALID' : 'INVALID');
    } else if (user.user_pass.startsWith('$2a$') || user.user_pass.startsWith('$2b$') || user.user_pass.startsWith('$2y$')) {
      // bcrypt hash
      validPassword = bcrypt.compareSync(password, user.user_pass);
      console.log('🔍 Bcrypt password check:', validPassword ? 'VALID' : 'INVALID');
    } else if (user.user_pass === password) {
      // Plain text
      validPassword = true;
      console.log('🔍 Plain text password check: VALID');
    } else {
      // Неизвестный формат, пробуем все
      const md5Hash = crypto.createHash('md5').update(password).digest('hex');
      if (md5Hash === user.user_pass) {
        validPassword = true;
        console.log('🔍 Auto-detected MD5: VALID');
      } else if (user.user_pass === password) {
        validPassword = true;
        console.log('🔍 Auto-detected plain text: VALID');
      } else {
        console.log('🔍 Password format unknown, all checks failed');
      }
    }

    if (!validPassword) {
      console.log('❌ Password validation failed');
      return res.status(401).json({
        success: false,
        message: 'Неверный логин или пароль'
      });
    }

    // Обновление информации о входе
    await db.query(
      `UPDATE login SET 
       logincount = logincount + 1, 
       lastlogin = NOW(), 
       last_ip = ? 
       WHERE account_id = ?`,
      [req.ip, user.account_id]
    );

    // Установка сессии
    req.session.userId = user.account_id;
    req.session.username = user.userid;
    req.session.groupId = user.group_id;

    console.log('✅ Login successful for user:', user.userid);

    res.json({
      success: true,
      message: 'Авторизация успешна',
      user: {
        id: user.account_id,
        username: user.userid,
        email: user.email,
        groupId: user.group_id
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при авторизации'
    });
  }
});

// Выход
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Ошибка при выходе'
      });
    }
    
    res.json({
      success: true,
      message: 'Выход выполнен успешно'
    });
  });
});

// Проверка авторизации
router.get('/check', (req, res) => {
  if (req.session.userId) {
    res.json({
      authenticated: true,
      user: {
        id: req.session.userId,
        username: req.session.username,
        groupId: req.session.groupId
      }
    });
  } else {
    res.json({
      authenticated: false
    });
  }
});

module.exports = router;