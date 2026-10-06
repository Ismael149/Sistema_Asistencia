const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const { registrarBitacora } = require('../services/bitacoraService');

// GET /api/personas - Listar todas las personas o filtrar por comuna/comisión/búsqueda
router.get('/', verifyToken, async (req, res) => {
  const { q, comuna, comision } = req.query;

  let query = 'SELECT * FROM personas WHERE 1=1';
  const params = [];

  if (q) {
    query += ' AND (nombre_apellido LIKE ? OR cedula LIKE ? OR comuna LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  if (comuna) {
    query += ' AND comuna = ?';
    params.push(comuna);
  }

  if (comision) {
    query += ' AND comision = ?';
    params.push(comision);
  }

  query += ' ORDER BY comuna ASC, nombre_apellido ASC';

  try {
    const personas = await db.prepare(query).all(...params);

    // Obtener comunas y comisiones únicas para filtros del frontend
    const comunasRows = await db.prepare("SELECT DISTINCT comuna FROM personas WHERE comuna IS NOT NULL AND comuna != '' ORDER BY comuna").all();
    const comisionesRows = await db.prepare("SELECT DISTINCT comision FROM personas WHERE comision IS NOT NULL AND comision != '' ORDER BY comision").all();

    const comunas = comunasRows.map(r => r.comuna);
    const comisiones = comisionesRows.map(r => r.comision);

    return res.json({ personas, comunas, comisiones });
  } catch (err) {
    console.error('Error al listar personas:', err);
    return res.status(500).json({ error: 'Error al consultar personas.' });
  }
});

// GET /api/personas/:id - Detalle de persona e HISTORIAL INDIVIDUAL DE ASISTENCIA
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const persona = await db.prepare('SELECT * FROM personas WHERE id = ?').get(id);
    if (!persona) {
      return res.status(404).json({ error: 'Persona no encontrada.' });
    }

    // Historial de asistencias de la persona
    const historial = await db.prepare(`
      SELECT 
        ad.id as detalle_id,
        ad.asistio,
        ad.observacion,
        al.id as lista_id,
        al.nombre_lista,
        al.fecha_guardado,
        al.hora_guardado,
        e.id as evento_id,
        e.titulo as evento_titulo,
        e.fecha as evento_fecha,
        e.hora_inicio as evento_hora_inicio,
        e.lugar as evento_lugar,
        e.categoria as evento_categoria
      FROM asistencias_detalle ad
      JOIN asistencias_lista al ON ad.asistencia_lista_id = al.id
      JOIN eventos e ON al.evento_id = e.id
      WHERE ad.persona_id = ?
      ORDER BY al.fecha_guardado DESC, al.hora_guardado DESC
    `).all(id);

    const totalEventosConvocado = historial.length;
    const totalAsistencias = historial.filter(h => h.asistio === 1).length;
    const totalInasistencias = totalEventosConvocado - totalAsistencias;
    const porcentajeAsistencia = totalEventosConvocado > 0 
      ? ((totalAsistencias / totalEventosConvocado) * 100).toFixed(1) 
      : '0.0';

    return res.json({
      persona,
      estadisticas: {
        totalEventosConvocado,
        totalAsistencias,
        totalInasistencias,
        porcentajeAsistencia: `${porcentajeAsistencia}%`
      },
      historial
    });
  } catch (err) {
    console.error('Error al obtener detalle de persona:', err);
    return res.status(500).json({ error: 'Error al consultar persona.' });
  }
});

// POST /api/personas - Crear nueva persona (Solo Admin)
router.post('/', verifyAdmin, async (req, res) => {
  const { cedula, nombre_apellido, municipio, comuna, comision, telefono } = req.body;

  if (!cedula || !nombre_apellido) {
    return res.status(400).json({ error: 'La Cédula y Nombre y Apellido son obligatorios.' });
  }

  try {
    const existing = await db.prepare('SELECT id FROM personas WHERE cedula = ?').get(cedula);
    if (existing) {
      return res.status(400).json({ error: `La cédula ${cedula} ya se encuentra registrada.` });
    }

    const stmt = db.prepare(`
      INSERT INTO personas (cedula, nombre_apellido, municipio, comuna, comision, telefono)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = await stmt.run(
      cedula.trim(),
      nombre_apellido.trim().toUpperCase(),
      (municipio || 'BOLIVAR').trim(),
      (comuna || 'GENERAL').trim(),
      (comision || 'GENERAL').trim(),
      (telefono || '').trim()
    );

    const nuevaPersona = await db.prepare('SELECT * FROM personas WHERE id = ?').get(result.lastInsertRowid);

    // Bitácora
    await registrarBitacora({
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      rol: req.user.rol,
      accion: 'CREAR_PERSONA',
      detalle: `Agregó a la persona "${nuevaPersona.nombre_apellido}" (C.I: ${nuevaPersona.cedula}, Comuna: ${nuevaPersona.comuna}).`,
      ip: req.ip
    });

    return res.status(201).json({ message: 'Persona agregada exitosamente.', persona: nuevaPersona });
  } catch (err) {
    console.error('Error al crear persona:', err);
    return res.status(500).json({ error: 'Error al registrar la persona.' });
  }
});

// PUT /api/personas/:id - Editar persona (Solo Admin)
router.put('/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { cedula, nombre_apellido, municipio, comuna, comision, telefono } = req.body;

  try {
    const personaPrev = await db.prepare('SELECT * FROM personas WHERE id = ?').get(id);
    if (!personaPrev) {
      return res.status(404).json({ error: 'Persona no encontrada.' });
    }

    if (cedula && cedula !== personaPrev.cedula) {
      const existing = await db.prepare('SELECT id FROM personas WHERE cedula = ? AND id != ?').get(cedula, id);
      if (existing) {
        return res.status(400).json({ error: `La cédula ${cedula} ya pertenece a otra persona.` });
      }
    }

    const stmt = db.prepare(`
      UPDATE personas
      SET cedula = ?, nombre_apellido = ?, municipio = ?, comuna = ?, comision = ?, telefono = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    await stmt.run(
      cedula ? cedula.trim() : personaPrev.cedula,
      nombre_apellido ? nombre_apellido.trim().toUpperCase() : personaPrev.nombre_apellido,
      municipio ? municipio.trim() : personaPrev.municipio,
      comuna ? comuna.trim() : personaPrev.comuna,
      comision ? comision.trim() : personaPrev.comision,
      telefono !== undefined ? telefono.trim() : personaPrev.telefono,
      id
    );

    const personaUpdated = await db.prepare('SELECT * FROM personas WHERE id = ?').get(id);

    // Bitácora
    await registrarBitacora({
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      rol: req.user.rol,
      accion: 'EDITAR_PERSONA',
      detalle: `Modificó los datos de "${personaUpdated.nombre_apellido}" (C.I: ${personaUpdated.cedula}).`,
      ip: req.ip
    });

    return res.json({ message: 'Persona actualizada correctamente.', persona: personaUpdated });
  } catch (err) {
    console.error('Error al actualizar persona:', err);
    return res.status(500).json({ error: 'Error al actualizar la persona.' });
  }
});

// DELETE /api/personas/:id - Eliminar persona (Solo Admin)
router.delete('/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const persona = await db.prepare('SELECT * FROM personas WHERE id = ?').get(id);
    if (!persona) {
      return res.status(404).json({ error: 'Persona no encontrada.' });
    }

    await db.prepare('DELETE FROM personas WHERE id = ?').run(id);

    // Bitácora
    await registrarBitacora({
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      rol: req.user.rol,
      accion: 'ELIMINAR_PERSONA',
      detalle: `Eliminó del sistema a la persona "${persona.nombre_apellido}" (C.I: ${persona.cedula}).`,
      ip: req.ip
    });

    return res.json({ message: `Persona "${persona.nombre_apellido}" eliminada exitosamente.` });
  } catch (err) {
    console.error('Error al eliminar persona:', err);
    return res.status(500).json({ error: 'Error al eliminar la persona.' });
  }
});

module.exports = router;
