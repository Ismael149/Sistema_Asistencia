const db = require('../db');

/**
 * Registra una acción en la Bitácora del Sistema.
 * @param {Object} params
 * @param {number|null} params.usuarioId
 * @param {string} params.usuarioNombre
 * @param {string} params.rol
 * @param {string} params.accion
 * @param {string} params.detalle
 * @param {string} [params.ip]
 */
function registrarBitacora({ usuarioId, usuarioNombre, rol, accion, detalle, ip = '' }) {
  try {
    const stmt = db.prepare(`
      INSERT INTO bitacora (usuario_id, usuario_nombre, rol, accion, detalle, ip)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(usuarioId || null, usuarioNombre || 'Anónimo', rol || 'GUEST', accion, detalle, ip);
  } catch (err) {
    console.error('❌ Error al registrar en bitácora:', err);
  }
}

module.exports = { registrarBitacora };
