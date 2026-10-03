const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, verifyToken } = require('../middleware/authMiddleware');
const { registrarBitacora } = require('../services/bitacoraService');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
  }

  const user = db.prepare('SELECT * FROM usuarios WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, nombre: user.nombre, rol: user.rol },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Registrar en bitácora
  registrarBitacora({
    usuarioId: user.id,
    usuarioNombre: user.nombre,
    rol: user.rol,
    accion: 'INICIO_SESION',
    detalle: `Inicio de sesión exitoso del usuario "${user.username}" (${user.rol}).`,
    ip: req.ip
  });

  return res.json({
    message: 'Inicio de sesión exitoso',
    token,
    user: {
      id: user.id,
      username: user.username,
      nombre: user.nombre,
      rol: user.rol
    }
  });
});

// POST /api/auth/logout
router.post('/logout', verifyToken, (req, res) => {
  registrarBitacora({
    usuarioId: req.user.id,
    usuarioNombre: req.user.nombre,
    rol: req.user.rol,
    accion: 'CIERRE_SESION',
    detalle: `Cierre de sesión del usuario "${req.user.username}".`,
    ip: req.ip
  });

  return res.json({ message: 'Sesión cerrada correctamente.' });
});

// GET /api/auth/me
router.get('/me', verifyToken, (req, res) => {
  const user = db.prepare('SELECT id, username, nombre, rol FROM usuarios WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }
  return res.json({ user });
});

module.exports = router;
