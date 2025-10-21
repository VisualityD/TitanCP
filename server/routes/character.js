const express = require('express');
const db = require('../config/database');
const router = express.Router();

// Создание персонажа (только для администраторов)
router.post('/create', async (req, res) => {
  try {
    const { charName, charClass = 0 } = req.body;
    
    // Проверяем авторизацию
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Необходима авторизация'
      });
    }

    // Проверяем права администратора
    if (req.session.groupId !== 99) {
      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав. Только администраторы могут создавать персонажей'
      });
    }

    if (!charName) {
      return res.status(400).json({
        success: false,
        message: 'Имя персонажа обязательно'
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

    // Создаем персонажа с минимальными полями
    const [result] = await db.query(
      `INSERT INTO \`char\` (
        account_id, name, class, base_level, job_level, zeny, last_map
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.session.userId, 
        charName, 
        charClass,
        1,  // base_level
        1,  // job_level
        1000, // zeny
        'prontera' // last_map
      ]
    );

    res.json({
      success: true,
      message: `Персонаж "${charName}" успешно создан`,
      character: {
        id: result.insertId,
        name: charName,
        class: charClass,
        level: 1,
        jobLevel: 1
      }
    });

  } catch (error) {
    console.error('Character creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании персонажа: ' + error.message
    });
  }
});

// Получение списка персонажей аккаунта
router.get('/list/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    const [characters] = await db.query(
      `SELECT char_id, name, class, base_level, job_level, zeny, 
       last_map, online 
       FROM \`char\` 
       WHERE account_id = ? 
       ORDER BY char_id`,
      [accountId]
    );

    res.json({
      success: true,
      characters: characters
    });

  } catch (error) {
    console.error('Character list error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении списка персонажей'
    });
  }
});

// Получение списка персонажей текущего пользователя
router.get('/my-characters', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Необходима авторизация'
      });
    }

    const [characters] = await db.query(
      `SELECT char_id, name, class, base_level, job_level, zeny, 
       last_map, online 
       FROM \`char\` 
       WHERE account_id = ? 
       ORDER BY char_id`,
      [req.session.userId]
    );

    res.json({
      success: true,
      characters: characters
    });

  } catch (error) {
    console.error('My characters error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении списка персонажей'
    });
  }
});

module.exports = router;