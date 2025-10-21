const express = require('express');
const db = require('../config/database');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Главная страница админ-панели
router.get('/', requireAdmin, async (req, res) => {
  try {
    // Получаем настройки сайта
    const [settings] = await db.query('SELECT * FROM site_settings');
    const settingsMap = {};
    settings.forEach(setting => {
      settingsMap[setting.setting_key] = setting.setting_value;
    });

    // Получаем статистику
    const [userStats] = await db.query('SELECT COUNT(*) as total_users FROM login');
    const [charStats] = await db.query('SELECT COUNT(*) as total_chars FROM `char`');
    const [onlineStats] = await db.query('SELECT COUNT(*) as online_chars FROM `char` WHERE online = 1');

    res.render('pages/admin', {
      title: 'Админ-панель | Ragnarok Online',
      page: 'admin',
      settings: settingsMap,
      stats: {
        totalUsers: userStats[0].total_users,
        totalChars: charStats[0].total_chars,
        onlineChars: onlineStats[0].online_chars
      }
    });

  } catch (error) {
    console.error('Admin panel error:', error);
    res.status(500).render('pages/error', {
      title: 'Ошибка',
      message: 'Ошибка при загрузке админ-панели'
    });
  }
});

// Управление сайтом - получение настроек
router.get('/site-settings', requireAdmin, async (req, res) => {
  try {
    const [settings] = await db.query('SELECT * FROM site_settings');
    const settingsMap = {};
    settings.forEach(setting => {
      settingsMap[setting.setting_key] = setting.setting_value;
    });

    res.json({
      success: true,
      settings: settingsMap
    });
  } catch (error) {
    console.error('Get site settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении настроек'
    });
  }
});

// Управление сайтом - обновление настроек
router.post('/site-settings', requireAdmin, async (req, res) => {
  try {
    const { settings } = req.body;

    for (const [key, value] of Object.entries(settings)) {
      await db.query(
        'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, value, value]
      );
    }

    res.json({
      success: true,
      message: 'Настройки успешно обновлены'
    });
  } catch (error) {
    console.error('Update site settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении настроек'
    });
  }
});

// Управление пользователями - список
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT account_id, userid, email, sex, group_id, state, 
             logincount, lastlogin, last_ip, character_slots
      FROM login 
      ORDER BY account_id DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении списка пользователей'
    });
  }
});

// Управление пользователями - блокировка/разблокировка
router.post('/users/:id/ban', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { banned } = req.body;

    // state: 0 - норма, 1 - заблокирован
    await db.query(
      'UPDATE login SET state = ? WHERE account_id = ?',
      [banned ? 1 : 0, id]
    );

    res.json({
      success: true,
      message: banned ? 'Пользователь заблокирован' : 'Пользователь разблокирован'
    });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при изменении статуса пользователя'
    });
  }
});

// Управление пользователями - персонажи
router.get('/users/:id/characters', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [characters] = await db.query(`
      SELECT char_id, name, class, base_level, job_level, zeny, 
             last_map, online, last_login
      FROM \`char\`
      WHERE account_id = ?
      ORDER BY char_id
    `, [id]);

    res.json({
      success: true,
      characters: characters
    });
  } catch (error) {
    console.error('Get user characters error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении списка персонажей'
    });
  }
});

// Создание персонажа (админ)
router.post('/characters/create', requireAdmin, async (req, res) => {
  try {
    const { accountId, charName, charClass = 0 } = req.body;

    if (!charName || !accountId) {
      return res.status(400).json({
        success: false,
        message: 'Имя персонажа и ID аккаунта обязательны'
      });
    }

    // Проверяем уникальность имени
    const [existingChars] = await db.query(
      'SELECT char_id FROM `char` WHERE name = ?',
      [charName]
    );

    if (existingChars.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Персонаж с именем "${charName}" уже существует`
      });
    }

    // Создаем персонажа
    const [result] = await db.query(
      `INSERT INTO \`char\` (
        account_id, name, class, base_level, job_level, zeny, last_map
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [accountId, charName, charClass, 1, 1, 1000, 'prontera']
    );

    res.json({
      success: true,
      message: `Персонаж "${charName}" успешно создан`,
      character: {
        id: result.insertId,
        name: charName,
        class: charClass
      }
    });

  } catch (error) {
    console.error('Admin character creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании персонажа'
    });
  }
});

// Удаление персонажа
router.delete('/characters/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await db.query('DELETE FROM `char` WHERE char_id = ?', [id]);

    res.json({
      success: true,
      message: 'Персонаж успешно удален'
    });
  } catch (error) {
    console.error('Delete character error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении персонажа'
    });
  }
});

module.exports = router;