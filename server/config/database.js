const mysql = require('mysql2');
require('dotenv').config();

// Создаем пул соединений (не promise-based)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'usbw',
  database: process.env.DB_NAME || 'ragnarok_db',
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  charset: 'utf8'
});

// Promise wrapper для обратной совместимости
const promisePool = pool.promise();

// Test connection
function testConnection() {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        console.error('❌ Database connection failed:', err.message);
        reject(err);
        return;
      }

      console.log('✅ Database connected successfully');
      
      // Проверим существование таблиц
      connection.query('SHOW TABLES', (err, results) => {
        connection.release();
        
        if (err) {
          console.error('❌ Show tables failed:', err.message);
          reject(err);
          return;
        }

        console.log(`📊 Found ${results.length} tables in database`);
        resolve(true);
      });
    });
  });
}

module.exports = promisePool;
module.exports.testConnection = testConnection;
module.exports.pool = pool; // Экспортируем и обычный пул для совместимости