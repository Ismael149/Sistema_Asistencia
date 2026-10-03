const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const db = require('../db');

/**
 * Obtiene los registros de asistencia agrupados según el tipo (diario, semanal, mensual)
 * o para una lista individual por lista_id.
 * @param {'diario'|'semanal'|'mensual'} tipo
 * @param {string} fechaRef - YYYY-MM-DD
 * @param {number|null} listaId - ID de lista individual (opcional)
 */
function getReportData(tipo, fechaRef, listaId = null) {
  let whereClause = '';
  const params = [];

  if (listaId) {
    // Descarga de lista individual específica
    whereClause = 'WHERE al.id = ?';
    params.push(listaId);
  } else if (tipo === 'diario') {
    whereClause = 'WHERE al.fecha_guardado = ?';
    params.push(fechaRef);
  } else if (tipo === 'semanal') {
    whereClause = `WHERE al.fecha_guardado BETWEEN date(?, '-6 days') AND date(?)`;
    params.push(fechaRef, fechaRef);
  } else if (tipo === 'mensual') {
    const mesRef = fechaRef.substring(0, 7);
    whereClause = `WHERE strftime('%Y-%m', al.fecha_guardado) = ?`;
    params.push(mesRef);
  } else {
    whereClause = 'WHERE al.fecha_guardado = ?';
    params.push(fechaRef);
  }

  const query = `
    SELECT 
      ad.id as detalle_id,
      al.id as lista_id,
      al.nombre_lista,
      al.fecha_guardado,
      al.hora_guardado,
      al.usuario_nombre as tomado_por,
      e.titulo as evento_titulo,
      e.categoria as evento_categoria,
      e.lugar as evento_lugar,
      p.cedula,
      p.nombre_apellido,
      p.municipio,
      p.comuna,
      p.comision,
      p.telefono,
      ad.asistio
    FROM asistencias_detalle ad
    JOIN asistencias_lista al ON ad.asistencia_lista_id = al.id
    JOIN eventos e ON al.evento_id = e.id
    JOIN personas p ON ad.persona_id = p.id
    ${whereClause}
    ORDER BY al.fecha_guardado DESC, e.titulo ASC, p.comuna ASC, p.nombre_apellido ASC
  `;

  const rows = db.prepare(query).all(...params);

  // Totales
  const totalRegistros = rows.length;
  const totalAsistentes = rows.filter(r => r.asistio === 1).length;
  const totalAusentes = rows.filter(r => r.asistio === 0).length;
  const porcentajeAsistencia = totalRegistros > 0 ? ((totalAsistentes / totalRegistros) * 100).toFixed(1) : '0.0';

  return {
    tipo,
    fechaRef,
    rows,
    resumen: {
      totalRegistros,
      totalAsistentes,
      totalAusentes,
      porcentajeAsistencia: `${porcentajeAsistencia}%`
    }
  };
}

/**
 * Genera un archivo Excel (.xlsx) y devuelve el Buffer
 */
async function generarExcelReporte(tipo, fechaRef, listaId = null) {
  const data = getReportData(tipo, fechaRef, listaId);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema de Registro de Asistencia';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(`Reporte_${tipo.toUpperCase()}`);

  // Estilo de Título
  worksheet.mergeCells('A1:K1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `SISTEMA DE ASISTENCIA - REPORTE ${tipo.toUpperCase()}`;
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '991B1B' } }; // Dark red
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 35;

  // Subtítulo / Fecha / Resumen
  worksheet.mergeCells('A2:K2');
  const subCell = worksheet.getCell('A2');
  subCell.value = `Fecha Referencia: ${fechaRef} | Total Asistentes: ${data.resumen.totalAsistentes} / ${data.resumen.totalRegistros} (${data.resumen.porcentajeAsistencia})`;
  subCell.font = { name: 'Arial', size: 11, italic: true };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 22;

  // Encabezados de tabla
  const headers = [
    'Fecha Lista',
    'Hora',
    'Evento',
    'Cédula',
    'Nombre y Apellido',
    'Comuna',
    'Comisión',
    'Teléfono',
    'Asistencia',
    'Registrado por'
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } }; // Slate 800
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Filas de Datos
  data.rows.forEach((r) => {
    const row = worksheet.addRow([
      r.fecha_guardado,
      r.hora_guardado,
      r.evento_titulo,
      r.cedula,
      r.nombre_apellido,
      r.comuna,
      r.comision,
      r.telefono || 'N/A',
      r.asistio === 1 ? 'PRESENTE' : 'AUSENTE',
      r.tomado_por || 'Sistema'
    ]);

    row.height = 20;

    // Colorear estado de asistencia
    const asistenciaCell = row.getCell(9);
    if (r.asistio === 1) {
      asistenciaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } }; // Light green
      asistenciaCell.font = { color: { argb: '166534' }, bold: true };
    } else {
      asistenciaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } }; // Light red
      asistenciaCell.font = { color: { argb: '991B1B' }, bold: true };
    }

    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        right: { style: 'thin', color: { argb: 'E2E8F0' } }
      };
      cell.alignment = { vertical: 'middle' };
    });
  });

  // Ajuste automático de ancho de columnas
  worksheet.columns.forEach((column) => {
    let maxLen = 12;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const val = cell.value ? cell.value.toString() : '';
      if (val.length > maxLen) maxLen = Math.min(val.length, 40);
    });
    column.width = maxLen + 4;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

/**
 * Genera un archivo PDF y escribe al res Stream
 */
function generarPDFReporte(tipo, fechaRef, res, listaId = null) {
  const data = getReportData(tipo, fechaRef, listaId);
  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

  doc.pipe(res);

  // Encabezado PDF
  doc.rect(30, 30, doc.page.width - 60, 45).fill('#991B1B');
  doc.fillColor('#FFFFFF')
     .fontSize(18)
     .font('Helvetica-Bold')
     .text(`REPORTE DE ASISTENCIA - ${tipo.toUpperCase()}`, 35, 42, { align: 'center' });

  doc.fontSize(10)
     .font('Helvetica')
     .text(`Fecha Referencia: ${fechaRef} | Generado el: ${new Date().toLocaleString('es-VE')}`, 35, 62, { align: 'center' });

  doc.moveDown(2);

  // Resumen Estadístico
  const startY = 90;
  doc.rect(30, startY, doc.page.width - 60, 35).fill('#F8FAFC').stroke('#E2E8F0');
  doc.fillColor('#1E293B')
     .fontSize(11)
     .font('Helvetica-Bold')
     .text(`Total Registros: ${data.resumen.totalRegistros}   |   Presentes: ${data.resumen.totalAsistentes}   |   Ausentes: ${data.resumen.totalAusentes}   |   % Asistencia: ${data.resumen.porcentajeAsistencia}`, 40, startY + 11);

  // Tabla
  let currentY = startY + 50;

  // Header de Tabla
  doc.rect(30, currentY, doc.page.width - 60, 20).fill('#1E293B');
  doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
  doc.text('Fecha/Hora', 35, currentY + 5, { width: 90 });
  doc.text('Evento', 130, currentY + 5, { width: 140 });
  doc.text('Cédula', 275, currentY + 5, { width: 70 });
  doc.text('Nombre y Apellido', 350, currentY + 5, { width: 150 });
  doc.text('Comuna', 505, currentY + 5, { width: 130 });
  doc.text('Teléfono', 640, currentY + 5, { width: 80 });
  doc.text('Estado', 725, currentY + 5, { width: 70 });

  currentY += 20;

  data.rows.forEach((r, idx) => {
    // Si excede la página, agregar nueva página
    if (currentY > doc.page.height - 50) {
      doc.addPage({ margin: 30, layout: 'landscape' });
      currentY = 30;
      // Re-draw header
      doc.rect(30, currentY, doc.page.width - 60, 20).fill('#1E293B');
      doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
      doc.text('Fecha/Hora', 35, currentY + 5, { width: 90 });
      doc.text('Evento', 130, currentY + 5, { width: 140 });
      doc.text('Cédula', 275, currentY + 5, { width: 70 });
      doc.text('Nombre y Apellido', 350, currentY + 5, { width: 150 });
      doc.text('Comuna', 505, currentY + 5, { width: 130 });
      doc.text('Teléfono', 640, currentY + 5, { width: 80 });
      doc.text('Estado', 725, currentY + 5, { width: 70 });
      currentY += 20;
    }

    const bgColor = idx % 2 === 0 ? '#FFFFFF' : '#F1F5F9';
    doc.rect(30, currentY, doc.page.width - 60, 18).fill(bgColor);

    doc.fillColor('#334155').fontSize(8).font('Helvetica');
    doc.text(`${r.fecha_guardado} ${r.hora_guardado.substring(0, 5)}`, 35, currentY + 4, { width: 90 });
    doc.text(r.evento_titulo, 130, currentY + 4, { width: 140, height: 14, ellipsis: true });
    doc.text(r.cedula, 275, currentY + 4, { width: 70 });
    doc.text(r.nombre_apellido, 350, currentY + 4, { width: 150, height: 14, ellipsis: true });
    doc.text(r.comuna, 505, currentY + 4, { width: 130, height: 14, ellipsis: true });
    doc.text(r.telefono || '-', 640, currentY + 4, { width: 80 });

    if (r.asistio === 1) {
      doc.fillColor('#15803D').font('Helvetica-Bold').text('PRESENTE', 725, currentY + 4, { width: 70 });
    } else {
      doc.fillColor('#B91C1C').font('Helvetica-Bold').text('AUSENTE', 725, currentY + 4, { width: 70 });
    }

    currentY += 18;
  });

  doc.end();
}

module.exports = {
  getReportData,
  generarExcelReporte,
  generarPDFReporte
};
