function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  
  return res.status(401).json({
    success: false,
    message: 'Требуется авторизация'
  });
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.userId && req.session.groupId === 99) {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Недостаточно прав'
  });
}

module.exports = { requireAuth, requireAdmin };