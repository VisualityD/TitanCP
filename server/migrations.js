const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

class DatabaseMigrator {
  constructor() {
    this.dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'usbw',
      database: process.env.DB_NAME || 'ragnarok_db'
    };
    
    this.migrations = [
      this.createLoginTable,
      this.createCharTable,
      this.createSiteSettingsTable,
      this.addDefaultSettings,
      this.addTestData
    ];
  }

  async connect() {
    this.connection = mysql.createConnection(this.dbConfig);
    return new Promise((resolve, reject) => {
      this.connection.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async disconnect() {
    if (this.connection) {
      this.connection.end();
    }
  }

  async runMigrations() {
    try {
      await this.connect();
      console.log('🚀 Starting database migrations...');

      for (let i = 0; i < this.migrations.length; i++) {
        console.log(`📝 Running migration ${i + 1}/${this.migrations.length}`);
        await this.migrations[i].call(this);
      }

      console.log('✅ All migrations completed successfully!');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async createLoginTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS \`login\` (
        \`account_id\` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
        \`userid\` VARCHAR(23) NOT NULL DEFAULT '',
        \`user_pass\` VARCHAR(255) NOT NULL DEFAULT '',
        \`sex\` ENUM('M','F','S') NOT NULL DEFAULT 'M',
        \`email\` VARCHAR(39) NOT NULL DEFAULT '',
        \`group_id\` TINYINT(3) NOT NULL DEFAULT '0',
        \`state\` INT(11) UNSIGNED NOT NULL DEFAULT '0',
        \`logincount\` MEDIUMINT(9) UNSIGNED NOT NULL DEFAULT '0',
        \`lastlogin\` DATETIME NULL DEFAULT NULL,
        \`last_ip\` VARCHAR(100) NOT NULL DEFAULT '',
        \`character_slots\` TINYINT(3) UNSIGNED NOT NULL DEFAULT '9',
        PRIMARY KEY (\`account_id\`),
        UNIQUE KEY \`userid\` (\`userid\`)
      ) ENGINE=InnoDB AUTO_INCREMENT=2000000 DEFAULT CHARSET=utf8mb4
    `;
    
    await this.executeQuery(sql);
    console.log('✅ Login table created/verified');
  }

  async createCharTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS \`char\` (
        \`char_id\` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
        \`account_id\` INT(11) UNSIGNED NOT NULL DEFAULT '0',
        \`name\` VARCHAR(30) NOT NULL DEFAULT '',
        \`class\` SMALLINT(6) UNSIGNED NOT NULL DEFAULT '0',
        \`base_level\` SMALLINT(6) UNSIGNED NOT NULL DEFAULT '1',
        \`job_level\` SMALLINT(6) UNSIGNED NOT NULL DEFAULT '1',
        \`zeny\` INT(11) UNSIGNED NOT NULL DEFAULT '0',
        \`last_map\` VARCHAR(50) NOT NULL DEFAULT 'prontera',
        \`online\` TINYINT(2) NOT NULL DEFAULT '0',
        PRIMARY KEY (\`char_id\`),
        UNIQUE KEY \`name\` (\`name\`),
        KEY \`account_id\` (\`account_id\`)
      ) ENGINE=InnoDB AUTO_INCREMENT=150000 DEFAULT CHARSET=utf8mb4
    `;
    
    await this.executeQuery(sql);
    console.log('✅ Char table created/verified');
  }

  async createSiteSettingsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS \`site_settings\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`setting_key\` VARCHAR(255) NOT NULL,
        \`setting_value\` TEXT NOT NULL,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`setting_key\` (\`setting_key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `;
    
    await this.executeQuery(sql);
    console.log('✅ Site settings table created/verified');
  }

  async addDefaultSettings() {
    const defaultSettings = [
      ['site_title', 'Ragnarok Online | Официальный сервер'],
      ['welcome_title', 'Добро пожаловать в Ragnarok Online'],
      ['welcome_subtitle', 'Присоединяйтесь к эпическому приключению в загадочном мире Midgard'],
      ['server_ip', 'localhost'],
      ['login_port', '6900'],
      ['char_port', '6121'],
      ['map_port', '5121'],
      ['server_status', 'online'],
      ['max_players', '1000']
    ];

    for (const [key, value] of defaultSettings) {
      const sql = `
        INSERT IGNORE INTO \`site_settings\` (setting_key, setting_value)
        VALUES (?, ?)
      `;
      await this.executeQuery(sql, [key, value]);
    }
    
    console.log('✅ Default settings added');
  }

  async addTestData() {
    // Проверяем, есть ли уже тестовые пользователи
    const checkAdmin = 'SELECT account_id FROM login WHERE userid = "test"';
    const result = await this.executeQuery(checkAdmin);
    
    if (result.length === 0) {
      // Добавляем тестового администратора
      const adminHashedPassword = bcrypt.hashSync('test', 10);
      const adminSql = `
        INSERT INTO login (account_id, userid, user_pass, sex, email, group_id, character_slots) 
        VALUES (1, 'test', ?, 'S', 'test@test.com', 99, 9)
      `;
      await this.executeQuery(adminSql, [adminHashedPassword]);
      console.log('✅ Test admin user added');

      // Добавляем тестового персонажа для администратора
      const adminCharSql = `
        INSERT IGNORE INTO char (char_id, account_id, name, class, base_level, job_level, zeny, last_map) 
        VALUES (1, 1, 'AdminChar', 0, 99, 50, 100000, 'prontera')
      `;
      await this.executeQuery(adminCharSql);
      console.log('✅ Admin character added');

      // Добавляем обычного тестового пользователя
      const userHashedPassword = bcrypt.hashSync('user', 10);
      const userSql = `
        INSERT INTO login (account_id, userid, user_pass, sex, email, group_id, character_slots) 
        VALUES (2, 'user', ?, 'M', 'user@test.com', 0, 9)
      `;
      await this.executeQuery(userSql, [userHashedPassword]);
      console.log('✅ Regular user added');

      // Добавляем тестового персонажа для обычного пользователя
      const userCharSql = `
        INSERT IGNORE INTO char (char_id, account_id, name, class, base_level, job_level, zeny, last_map) 
        VALUES (2, 2, 'PlayerChar', 1, 50, 25, 50000, 'prontera')
      `;
      await this.executeQuery(userCharSql);
      console.log('✅ Player character added');
    } else {
      console.log('ℹ️ Test data already exists, skipping...');
    }
  }

  executeQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.connection.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  }
}

// Запуск миграций если скрипт вызван напрямую
if (require.main === module) {
  const migrator = new DatabaseMigrator();
  migrator.runMigrations()
    .then(() => {
      console.log('\n🚀 Database migrations completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = DatabaseMigrator;