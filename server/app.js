const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Настройка EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration ДО статических файлов
app.use(session({
  secret: process.env.SESSION_SECRET || 'ragnarok-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, 
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true
  }
}));

// Middleware для передачи user данных во все шаблоны
app.use((req, res, next) => {
  res.locals.user = req.session.userId ? {
    id: req.session.userId,
    username: req.session.username,
    groupId: req.session.groupId
  } : null;
  res.locals.currentUrl = req.url;
  next();
});

// Database connection
const db = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const characterRoutes = require('./routes/character');
const adminRoutes = require('./routes/admin');

// Routes ДО статических файлов
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/character', characterRoutes);
app.use('/api/admin', adminRoutes);

// Маршруты ДО статических файлов
app.get('/', (req, res) => {
  res.render('pages/index', {
    title: 'Ragnarok Online | Официальный сервер',
    page: 'home'
  });
});

app.get('/profile', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  
  res.render('pages/profile', {
    title: 'Личный кабинет | Ragnarok Online',
    page: 'profile'
  });
});

app.get('/download', (req, res) => {
  res.render('pages/download', {
    title: 'Скачать клиент | Ragnarok Online',
    page: 'download'
  });
});

app.get('/server-info', (req, res) => {
  res.render('pages/server-info', {
    title: 'Информация о сервере | Ragnarok Online',
    page: 'server-info'
  });
});

app.get('/classes', (req, res) => {
  res.render('pages/classes', {
    title: 'Классы | Ragnarok Online',
    page: 'classes'
  });
});

app.get('/admin', (req, res) => {
  if (!req.session.userId || req.session.groupId !== 99) {
    return res.redirect('/');
  }
  res.render('pages/admin', {
    title: 'Админ-панель | Ragnarok Online',
    page: 'admin'
  });
});

// Статические файлы ПОСЛЕ всех маршрутов
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  db.query('SELECT 1 as test')
    .then(() => {
      res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: 'Connected',
        server: 'Ragnarok Online Website'
      });
    })
    .catch(error => {
      res.status(500).json({ 
        status: 'Error', 
        database: 'Disconnected',
        error: error.message 
      });
    });
});

// Server status endpoint
app.get('/api/server-status', (req, res) => {
  Promise.all([
    db.query('SELECT COUNT(*) as count FROM `char` WHERE online = 1'),
    db.query('SELECT COUNT(*) as count FROM login')
  ])
  .then(([[onlinePlayers], [totalAccounts]]) => {
    res.json({
      online: onlinePlayers[0].count,
      totalAccounts: totalAccounts[0].count,
      status: 'online',
      serverTime: new Date().toISOString()
    });
  })
  .catch(error => {
    res.json({
      online: 0,
      totalAccounts: 0,
      status: 'offline',
      error: error.message
    });
  });
});

// Обработка 404 - должна быть ПОСЛЕ всех маршрутов и статических файлов
app.use((req, res) => {
  res.status(404).render('pages/404', {
    title: 'Страница не найдена | Ragnarok Online',
    page: '404'
  });
});

// Initialize database and start server
// Initialize database and start server
async function startServer() {
  try {
    console.log('🚀 Starting Ragnarok Online Website Server...');
    
    // Запускаем миграции вместо полной инициализации
    const DatabaseMigrator = require('./migrations');
    const migrator = new DatabaseMigrator();
    await migrator.runMigrations();

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🎮 Ragnarok Online Website Server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`👤 Test accounts: login - "test", password - "test"`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();