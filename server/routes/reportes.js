const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyAdmin } = require('../middleware/authMiddleware');
const { getReportData, generarExcelReporte, generarPDFReporte } = require('../services/reportService');
const { registrarBitacora } = require('../services/bitacoraService');

// GET /api/reportes/listas
router.get('/listas', verifyAdmin, async (req, res) => {
  const { tipo, fecha } = req.query;
  const fechaRef = fecha || new Date().toISOString().split('T')[0];
  const tipoVal = (tipo || 'diario').toLowerCase();

  let whereClause = '';
  const params = [];

  if (tipoVal === 'diario') {
    whereClause = 'WHERE al.fecha_guardado = ?';
    params.push(fechaRef);
  } else if (tipoVal === 'semanal') {
    const d = new Date(fechaRef);
    d.setDate(d.getDate() - 6);
    const startFecha = d.toISOString().split('T')[0];
    whereClause = 'WHERE al.fecha_guardado >= ? AND al.fecha_guardado <= ?';
    params.push(startFecha, fechaRef);
  } else if (tipoVal === 'mensual') {
    const mesRef = fechaRef.substring(0, 7);
    whereClause = 'WHERE al.fecha_guardado LIKE ?';
    params.push(`${mesRef}%`);
  }

  try {
    const listas = await db.prepare(`
      SELECT
        al.id,
        al.nombre_lista,
        al.fecha_guardado,
        al.hora_guardado,
        al.usuario_nombre as tomado_por,
        al.observaciones,
        e.id as evento_id,
        e.titulo as evento_titulo,
        e.categoria as evento_categoria,
        e.lugar as evento_lugar,
        e.hora_inicio as evento_hora_inicio,
        (SELECT COUNT(*) FROM asistencias_detalle WHERE asistencia_lista_id = al.id) as total_personas,
        (SELECT COUNT(*) FROM asistencias_detalle WHERE asistencia_lista_id = al.id AND asistio = 1) as total_presentes,
        (SELECT COUNT(*) FROM asistencias_detalle WHERE asistencia_lista_id = al.id AND asistio = 0) as total_ausentes
      FROM asistencias_lista al
      JOIN eventos e ON al.evento_id = e.id
      ${whereClause}
      ORDER BY al.fecha_guardado DESC, al.hora_guardado DESC
    `).all(...params);

    const listasFormateadas = listas.map(l => ({
      ...l,
      total_personas: parseInt(l.total_personas || 0),
      total_presentes: parseInt(l.total_presentes || 0),
      total_ausentes: parseInt(l.total_ausentes || 0)
    }));

    // Calcular resumen global del período
    const totalRegistros = listasFormateadas.reduce((s, l) => s + l.total_personas, 0);
    const totalAsistentes = listasFormateadas.reduce((s, l) => s + l.total_presentes, 0);
    const totalAusentes = listasFormateadas.reduce((s, l) => s + l.total_ausentes, 0);
    const porcentajeAsistencia = totalRegistros > 0
      ? ((totalAsistentes / totalRegistros) * 100).toFixed(1) + '%'
      : '0.0%';

    return res.json({
      listas: listasFormateadas,
      resumen: { totalRegistros, totalAsistentes, totalAusentes, porcentajeAsistencia },
      tipo: tipoVal,
      fechaRef
    });
  } catch (err) {
    console.error('Error al obtener listas del período:', err);
    return res.status(500).json({ error: 'Error al consultar las listas de asistencia.' });
  }
});

// GET /api/reportes/excel
router.get('/excel', verifyAdmin, async (req, res) => {
  const { tipo, fecha, lista_id } = req.query;
  const fechaRef = fecha || new Date().toISOString().split('T')[0];
  const tipoVal = (tipo || 'diario').toLowerCase();

  try {
    const buffer = await generarExcelReporte(tipoVal, fechaRef, lista_id ? parseInt(lista_id) : null);

    await registrarBitacora({
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      rol: req.user.rol,
      accion: 'DESCARGAR_REPORTE',
      detalle: lista_id
        ? `Descargó lista individual #${lista_id} en formato Excel.`
        : `Descargó reporte Excel (${tipoVal.toUpperCase()}) — fecha ref: ${fechaRef}.`,
      ip: req.ip
    });

    const filename = lista_id
      ? `Lista_Asistencia_${lista_id}_${fechaRef}.xlsx`
      : `Reporte_Asistencia_${tipoVal.toUpperCase()}_${fechaRef}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err) {
    console.error('Error al exportar Excel:', err);
    return res.status(500).json({ error: 'Error al generar el archivo Excel.' });
  }
});

// GET /api/reportes/pdf
router.get('/pdf', verifyAdmin, async (req, res) => {
  const { tipo, fecha, lista_id } = req.query;
  const fechaRef = fecha || new Date().toISOString().split('T')[0];
  const tipoVal = (tipo || 'diario').toLowerCase();

  try {
    const filename = lista_id
      ? `Lista_Asistencia_${lista_id}_${fechaRef}.pdf`
      : `Reporte_Asistencia_${tipoVal.toUpperCase()}_${fechaRef}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await registrarBitacora({
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      rol: req.user.rol,
      accion: 'DESCARGAR_REPORTE',
      detalle: lista_id
        ? `Descargó lista individual #${lista_id} en formato PDF.`
        : `Descargó reporte PDF (${tipoVal.toUpperCase()}) — fecha ref: ${fechaRef}.`,
      ip: req.ip
    });

    await generarPDFReporte(tipoVal, fechaRef, res, lista_id ? parseInt(lista_id) : null);
  } catch (err) {
    console.error('Error al exportar PDF:', err);
    return res.status(500).json({ error: 'Error al generar el archivo PDF.' });
  }
});

module.exports = router;
