const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');
const { registrarBitacora } = require('../services/bitacoraService');

// GET /api/eventos - Obtener todos los eventos (soporta filtro por fecha o mes)
router.get('/', verifyToken, async (req, res) => {
  const { fecha, mes } = req.query; // mes format: 'YYYY-MM'

  let query = 'SELECT * FROM eventos WHERE 1=1';
  const params = [];

  if (fecha) {
    query += ' AND fecha = ?';
    params.push(fecha);
  } else if (mes) {
    query += ' AND fecha LIKE ?';
    params.push(`${mes}%`);
  }

  query += ' ORDER BY fecha DESC, hora_inicio ASC';

  try {
    const eventos = await db.prepare(query).all(...params);

    // Agregar estadísticas de asistencia para cada evento
    const eventosConStats = await Promise.all(eventos.map(async (ev) => {
      const list = await db.prepare('SELECT id, fecha_guardado, hora_guardado FROM asistencias_lista WHERE evento_id = ? ORDER BY id DESC LIMIT 1').get(ev.id);
      let totalAsistentes = 0;
      let totalRegistrados = 0;

      if (list) {
        const stats = await db.prepare(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN asistio = 1 THEN 1 ELSE 0 END) as presentes
          FROM asistencias_detalle
          WHERE asistencia_lista_id = ?
        `).get(list.id);
        totalRegistrados = parseInt(stats.total || 0);
        totalAsistentes = parseInt(stats.presentes || 0);
      }

      return {
        ...ev,
        tiene_asistencia: !!list,
        ultima_lista: list || null,
        totalRegistrados,
        totalAsistentes
      };
    }));

    return res.json({ eventos: eventosConStats });
  } catch (err) {
    console.error('Error al listar eventos:', err);
    return res.status(500).json({ error: 'Error al consultar eventos.' });
  }
});

// GET /api/eventos/:id - Obtener un evento específico
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const evento = await db.prepare('SELECT * FROM eventos WHERE id = ?').get(id);
    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado.' });
    }
    return res.json({ evento });
  } catch (err) {
    return res.status(500).json({ error: 'Error al consultar el evento.' });
  }
});

// POST /api/eventos - Crear un evento en el calendario
router.post('/', verifyToken, async (req, res) => {
  const { titulo, descripcion, lugar, fecha, hora_inicio, hora_fin, categoria, estado } = req.body;

  if (!titulo || !fecha) {
    return res.status(400).json({ error: 'El título y la fecha del evento son obligatorios.' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO eventos (titulo, descripcion, lugar, fecha, hora_inicio, hora_fin, categoria, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await stmt.run(
      titulo.trim(),
      (descripcion || '').trim(),
      (lugar || '').trim(),
      fecha.trim(),
      hora_inicio || '09:00',
      hora_fin || '12:00',
      categoria || 'General',
      estado || 'programado'
    );

    const nuevoEvento = await db.prepare('SELECT * FROM eventos WHERE id = ?').get(result.lastInsertRowid);

    // Bitácora
    await registrarBitacora({
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      rol: req.user.rol,
      accion: 'CREAR_EVENTO',
      detalle: `Asignó nuevo evento "${nuevoEvento.titulo}" para la fecha ${nuevoEvento.fecha} (${nuevoEvento.hora_inicio}).`,
      ip: req.ip
    });

    return res.status(201).json({ message: 'Evento creado exitosamente.', evento: nuevoEvento });
  } catch (err) {
    console.error('Error al crear evento:', err);
    return res.status(500).json({ error: 'Error al crear el evento.' });
  }
});

// PUT /api/eventos/:id - Editar evento
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion, lugar, fecha, hora_inicio, hora_fin, categoria, estado } = req.body;

  try {
    const eventoPrev = await db.prepare('SELECT * FROM eventos WHERE id = ?').get(id);
    if (!eventoPrev) {
      return res.status(404).json({ error: 'Evento no encontrado.' });
    }

    const stmt = db.prepare(`
      UPDATE eventos
      SET titulo = ?, descripcion = ?, lugar = ?, fecha = ?, hora_inicio = ?, hora_fin = ?, categoria = ?, estado = ?
      WHERE id = ?
    `);

    await stmt.run(
      titulo ? titulo.trim() : eventoPrev.titulo,
      descripcion !== undefined ? descripcion.trim() : eventoPrev.descripcion,
      lugar !== undefined ? lugar.trim() : eventoPrev.lugar,
      fecha ? fecha.trim() : eventoPrev.fecha,
      hora_inicio || eventoPrev.hora_inicio,
      hora_fin || eventoPrev.hora_fin,
      categoria || eventoPrev.categoria,
      estado || eventoPrev.estado,
      id
    );

    const eventoUpdated = await db.prepare('SELECT * FROM eventos WHERE id = ?').get(id);

    // Bitácora
    await registrarBitacora({
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      rol: req.user.rol,
      accion: 'EDITAR_EVENTO',
      detalle: `Modificó el evento "${eventoUpdated.titulo}" (${eventoUpdated.fecha}).`,
      ip: req.ip
    });

    return res.json({ message: 'Evento actualizado correctamente.', evento: eventoUpdated });
  } catch (err) {
    console.error('Error al actualizar evento:', err);
    return res.status(500).json({ error: 'Error al actualizar el evento.' });
  }
});

// DELETE /api/eventos/:id - Eliminar evento
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const evento = await db.prepare('SELECT * FROM eventos WHERE id = ?').get(id);

    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado.' });
    }

    await db.prepare('DELETE FROM eventos WHERE id = ?').run(id);

    // Bitácora
    await registrarBitacora({
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      rol: req.user.rol,
      accion: 'ELIMINAR_EVENTO',
      detalle: `Eliminó el evento "${evento.titulo}" (Fecha: ${evento.fecha}).`,
      ip: req.ip
    });

    return res.json({ message: `Evento "${evento.titulo}" eliminado exitosamente.` });
  } catch (err) {
    console.error('Error al eliminar evento:', err);
    return res.status(500).json({ error: 'Error al eliminar el evento.' });
  }
});

module.exports = router;
