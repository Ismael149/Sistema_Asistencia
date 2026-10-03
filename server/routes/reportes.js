const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyAdmin } = require('../middleware/authMiddleware');
const { getReportData, generarExcelReporte, generarPDFReporte } = require('../services/reportService');
const { registrarBitacora } = require('../services/bitacoraService');

/**
 * GET /api/reportes/listas
 * Devuelve las listas de asistencia guardadas filtradas por período, con estadísticas resumidas.
 * Parámetros: tipo ('diario'|'semanal'|'mensual'), fecha (YYYY-MM-DD)
 */
router.get('/listas', verifyAdmin, (req, res) => {
  const { tipo, fecha } = req.query;
  const fechaRef = fecha || new Date().toISOString().split('T')[0];
  const tipoVal = (tipo || 'diario').toLowerCase();

  let whereClause = '';
  const params = [];

  if (tipoVal === 'diario') {
    whereClause = 'WHERE al.fecha_guardado = ?';
    params.push(fechaRef);
  } else if (tipoVal === 'semanal') {
    // Los 7 días hacia atrás desde la fecha de hoy (inclusive)
    whereClause = `WHERE al.fecha_guardado BETWEEN date(?, '-6 days') AND date(?)`;
    params.push(fechaRef, fechaRef);
  } else if (tipoVal === 'mensual') {
    // Todo el mes del año y mes de fechaRef (YYYY-MM)
    const mesRef = fechaRef.substring(0, 7);
    whereClause = `WHERE strftime('%Y-%m', al.fecha_guardado) = ?`;
    params.push(mesRef);
  }

  try {
    const listas = db.prepare(`
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

    // Calcular resumen global del período
    const totalRegistros = listas.reduce((s, l) => s + l.total_personas, 0);
    const totalAsistentes = listas.reduce((s, l) => s + l.total_presentes, 0);
    const totalAusentes = listas.reduce((s, l) => s + l.total_ausentes, 0);
    const porcentajeAsistencia = totalRegistros > 0
      ? ((totalAsistentes / totalRegistros) * 100).toFixed(1) + '%'
      : '0.0%';

    return res.json({
      listas,
      resumen: { totalRegistros, totalAsistentes, totalAusentes, porcentajeAsistencia },
      tipo: tipoVal,
      fechaRef
    });
  } catch (err) {
    console.error('Error al obtener listas del período:', err);
    return res.status(500).json({ error: 'Error al consultar las listas de asistencia.' });
  }
});

/**
 * GET /api/reportes/excel
 * Descarga el reporte de asistencia en formato Excel (.xlsx) (Solo Admin)
 * Parámetros: tipo, fecha  ─ O ─  lista_id (para descargar lista individual)
 */
router.get('/excel', verifyAdmin, async (req, res) => {
  const { tipo, fecha, lista_id } = req.query;
  const fechaRef = fecha || new Date().toISOString().split('T')[0];
  const tipoVal = (tipo || 'diario').toLowerCase();

  try {
    const buffer = await generarExcelReporte(tipoVal, fechaRef, lista_id ? parseInt(lista_id) : null);

    registrarBitacora({
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

/**
 * GET /api/reportes/pdf
 * Descarga el reporte en formato PDF (Solo Admin)
 */
router.get('/pdf', verifyAdmin, (req, res) => {
  const { tipo, fecha, lista_id } = req.query;
  const fechaRef = fecha || new Date().toISOString().split('T')[0];
  const tipoVal = (tipo || 'diario').toLowerCase();

  try {
    const filename = lista_id
      ? `Lista_Asistencia_${lista_id}_${fechaRef}.pdf`
      : `Reporte_Asistencia_${tipoVal.toUpperCase()}_${fechaRef}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    registrarBitacora({
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      rol: req.user.rol,
      accion: 'DESCARGAR_REPORTE',
      detalle: lista_id
        ? `Descargó lista individual #${lista_id} en formato PDF.`
        : `Descargó reporte PDF (${tipoVal.toUpperCase()}) — fecha ref: ${fechaRef}.`,
      ip: req.ip
    });

    generarPDFReporte(tipoVal, fechaRef, res, lista_id ? parseInt(lista_id) : null);
  } catch (err) {
    console.error('Error al exportar PDF:', err);
    return res.status(500).json({ error: 'Error al generar el archivo PDF.' });
  }
});

module.exports = router;
