const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');
const { registrarBitacora } = require('../services/bitacoraService');

// GET /api/asistencias/evento/:eventoId - Obtener datos para tomar asistencia o ver asistencia tomada
router.get('/evento/:eventoId', verifyToken, async (req, res) => {
  const { eventoId } = req.params;

  try {
    const evento = await db.prepare('SELECT * FROM eventos WHERE id = ?').get(eventoId);
    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado.' });
    }

    // Verificar si ya existe una lista de asistencia guardada para este evento
    const ultimaLista = await db.prepare(`
      SELECT * FROM asistencias_lista 
      WHERE evento_id = ? 
      ORDER BY id DESC LIMIT 1
    `).get(eventoId);

    // Obtener todas las personas registradas en la base de datos (con orden por comuna y nombre)
    const personas = await db.prepare('SELECT * FROM personas ORDER BY comuna ASC, nombre_apellido ASC').all();

    // Si ya hay una lista guardada, mapear el estado previo de cada persona
    let mapaAsistencia = {};
    if (ultimaLista) {
      const detalles = await db.prepare('SELECT persona_id, asistio, observacion FROM asistencias_detalle WHERE asistencia_lista_id = ?').all(ultimaLista.id);
      detalles.forEach(d => {
        mapaAsistencia[d.persona_id] = { asistio: d.asistio === 1, observacion: d.observacion || '' };
      });
    }

    const personasConAsistencia = personas.map(p => ({
      ...p,
      asistio: mapaAsistencia[p.id] ? mapaAsistencia[p.id].asistio : false,
      observacion: mapaAsistencia[p.id] ? mapaAsistencia[p.id].observacion : ''
    }));

    return res.json({
      evento,
      ultimaLista: ultimaLista || null,
      personas: personasConAsistencia
    });
  } catch (err) {
    console.error('Error al cargar datos de asistencia para evento:', err);
    return res.status(500).json({ error: 'Error al consultar datos de asistencia.' });
  }
});

// POST /api/asistencias/guardar - GUARDAR LA LISTA DE ASISTENCIA
router.post('/guardar', verifyToken, async (req, res) => {
  const { evento_id, asistencias, observaciones } = req.body;

  if (!evento_id || !asistencias || !Array.isArray(asistencias)) {
    return res.status(400).json({ error: 'Datos incompletos para guardar la asistencia.' });
  }

  try {
    const evento = await db.prepare('SELECT * FROM eventos WHERE id = ?').get(evento_id);
    if (!evento) {
      return res.status(404).json({ error: 'El evento especificado no existe.' });
    }

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const fechaGuardado = `${yyyy}-${mm}-${dd}`;
    const horaGuardado = now.toTimeString().split(' ')[0]; // 'HH:MM:SS'

    const nombreLista = `Lista de Asistencia - ${evento.titulo}`;

    // Ejecutar guardado (transacción o secuencia)
    const saveTransaction = db.transaction(async () => {
      // 1. Insertar encabezado de la lista
      const insertLista = db.prepare(`
        INSERT INTO asistencias_lista (evento_id, nombre_lista, fecha_guardado, hora_guardado, usuario_id, usuario_nombre, observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const resLista = await insertLista.run(
        evento_id,
        nombreLista,
        fechaGuardado,
        horaGuardado,
        req.user.id,
        req.user.nombre,
        observaciones || ''
      );
      const asistenciaListaId = resLista.lastInsertRowid;

      // 2. Insertar detalles por cada persona
      const insertDetalle = db.prepare(`
        INSERT INTO asistencias_detalle (asistencia_lista_id, evento_id, persona_id, asistio, observacion)
        VALUES (?, ?, ?, ?, ?)
      `);

      let totalPresentes = 0;

      for (const item of asistencias) {
        const asistioVal = item.asistio ? 1 : 0;
        if (asistioVal === 1) totalPresentes++;

        await insertDetalle.run(
          asistenciaListaId,
          evento_id,
          item.persona_id,
          asistioVal,
          item.observacion || ''
        );
      }

      // Actualizar estado del evento a 'en_curso' o 'finalizado'
      await db.prepare("UPDATE eventos SET estado = 'finalizado' WHERE id = ?").run(evento_id);

      return { asistenciaListaId, totalPresentes, totalTotal: asistencias.length };
    });

    const result = await saveTransaction();

    // 3. REGISTRAR CLARAMENTE EN LA BITÁCORA DEL SISTEMA
    await registrarBitacora({
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      rol: req.user.rol,
      accion: 'TOMAR_ASISTENCIA',
      detalle: `Guardó la "${nombreLista}" el ${fechaGuardado} a las ${horaGuardado}. Presentes: ${result.totalPresentes} / ${result.totalTotal} personas.`,
      ip: req.ip
    });

    return res.status(201).json({
      message: 'Lista de asistencia guardada exitosamente.',
      lista: {
        id: result.asistenciaListaId,
        nombre_lista: nombreLista,
        fecha_guardado: fechaGuardado,
        hora_guardado: horaGuardado,
        totalPresentes: result.totalPresentes,
        totalPersonas: result.totalTotal
      }
    });

  } catch (err) {
    console.error('Error al guardar lista de asistencia:', err);
    return res.status(500).json({ error: 'Error interno al guardar la asistencia.' });
  }
});

// GET /api/asistencias/listas - Historial de listas guardadas
router.get('/listas', verifyToken, async (req, res) => {
  try {
    const listas = await db.prepare(`
      SELECT 
        al.*,
        e.titulo as evento_titulo,
        e.fecha as evento_fecha,
        (SELECT COUNT(*) FROM asistencias_detalle WHERE asistencia_lista_id = al.id) as total_personas,
        (SELECT COUNT(*) FROM asistencias_detalle WHERE asistencia_lista_id = al.id AND asistio = 1) as total_presentes
      FROM asistencias_lista al
      JOIN eventos e ON al.evento_id = e.id
      ORDER BY al.fecha_guardado DESC, al.hora_guardado DESC
    `).all();

    const listasFormateadas = listas.map(l => ({
      ...l,
      total_personas: parseInt(l.total_personas || 0),
      total_presentes: parseInt(l.total_presentes || 0)
    }));

    return res.json({ listas: listasFormateadas });
  } catch (err) {
    console.error('Error al listar asistencias:', err);
    return res.status(500).json({ error: 'Error al consultar historial de asistencias.' });
  }
});

module.exports = router;
