const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'psuv_asistencia_secret_key_2026';

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Formato de token inválido.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }
}

function verifyAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user && req.user.rol === 'admin') {
      next();
    } else {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de Administrador.' });
    }
  });
}

module.exports = {
  JWT_SECRET,
  verifyToken,
  verifyAdmin
};
