const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyAdmin } = require('../middleware/authMiddleware');

// GET /api/bitacora - Consultar la bitácora del sistema (Solo Admin)
router.get('/', verifyAdmin, (req, res) => {
  const { q, accion, usuario } = req.query;

  let query = 'SELECT * FROM bitacora WHERE 1=1';
  const params = [];

  if (q) {
    query += ' AND (detalle LIKE ? OR usuario_nombre LIKE ? OR accion LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  if (accion) {
    query += ' AND accion = ?';
    params.push(accion);
  }

  if (usuario) {
    query += ' AND usuario_nombre LIKE ?';
    params.push(`%${usuario}%`);
  }

  query += ' ORDER BY fecha_hora DESC LIMIT 500';

  const logs = db.prepare(query).all(...params);

  // Acciones únicas registradas para el filtro
  const acciones = db.prepare('SELECT DISTINCT accion FROM bitacora ORDER BY accion').all().map(r => r.accion);

  return res.json({
    total: logs.length,
    acciones,
    logs
  });
});

module.exports = router;
