const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

/**
 * Lee y extrae todas las personas de los 3 archivos Excel:
 * 1. Equipos Comunales PSUV BOLIVAR.xlsx (las 4 comunas, incluyendo Flores de Mi Patria)
 * 2. EPM BOLIVAR_2026.xlsx (Equipo Político Municipal)
 * 3. LISTADOS JEFES DE UBCH Y COMANDO DE COMUNIDAD.xlsx (Jefes de UBCH)
 */
function parseAllPersonasFromExcels() {
  const allPersonas = [];
  const rootDir = path.join(__dirname, '../../');

  // 1. Equipos Comunales PSUV BOLIVAR.xlsx
  const f1 = path.join(rootDir, 'Equipos Comunales PSUV BOLIVAR.xlsx');
  if (fs.existsSync(f1)) {
    try {
      const wb = xlsx.readFile(f1);
      wb.SheetNames.forEach(sheetName => {
        const sheet = wb.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        let headerIdx = -1;
        let colMap = { municipio: -1, comuna: -1, comision: -1, nombre: -1, cedula: -1, telefono: -1 };

        for (let i = 0; i < data.length; i++) {
          const row = data[i] || [];
          for (let col = 0; col < row.length; col++) {
            const val = String(row[col] || '').toUpperCase().trim();
            if (val.includes('MUNICIPIO')) colMap.municipio = col;
            if (val.includes('COMUNA')) colMap.comuna = col;
            if (val.includes('COMISION')) colMap.comision = col;
            if (val.includes('NOMBRE')) colMap.nombre = col;
            if (val.includes('CEDULA')) colMap.cedula = col;
            if (val.includes('TELEFONO')) colMap.telefono = col;
          }
          if (colMap.nombre !== -1 && (colMap.cedula !== -1 || colMap.comuna !== -1)) {
            headerIdx = i;
            break;
          }
        }

        if (headerIdx !== -1) {
          for (let j = headerIdx + 1; j < data.length; j++) {
            const r = data[j];
            if (!r || r.length < 2) continue;

            let nombre = String(r[colMap.nombre] || '').trim().toUpperCase();
            if (!nombre || nombre.includes('NOMBRE') || nombre.includes('COMUNA') || nombre.includes('EQUIPO')) continue;

            let cedulaRaw = colMap.cedula !== -1 ? r[colMap.cedula] : '';
            let cedula = cedulaRaw ? String(cedulaRaw).replace(/[^0-9]/g, '') : '';
            if (!cedula) continue;

            let municipio = colMap.municipio !== -1 && r[colMap.municipio] ? String(r[colMap.municipio]).trim() : 'BOLIVAR';
            let comuna = colMap.comuna !== -1 && r[colMap.comuna] ? String(r[colMap.comuna]).trim().toUpperCase() : sheetName.trim().toUpperCase();
            let comision = colMap.comision !== -1 && r[colMap.comision] ? String(r[colMap.comision]).trim().toUpperCase() : 'GENERAL';
            let telefono = colMap.telefono !== -1 && r[colMap.telefono] ? String(r[colMap.telefono]).trim() : '';

            // Limpieza y normalización de nombre de comuna
            comuna = comuna.replace(/\s+/g, ' ');
            if (comuna.includes('FLORES')) comuna = 'FLORES DE MI PATRIA';
            else if (comuna.includes('HEROES')) comuna = 'HEROES DE SAN MATEO';
            else if (comuna.includes('RICAURTE')) comuna = 'ANTONIO RICAURTE';
            else if (comuna.includes('ZAMORA')) comuna = 'EZEQUIEL ZAMORA';

            allPersonas.push({
              cedula,
              nombre_apellido: nombre,
              municipio: municipio || 'BOLIVAR',
              comuna,
              comision: comision || 'GENERAL',
              telefono
            });
          }
        }
      });
    } catch (err) {
      console.error('Error leyendo Equipos Comunales PSUV BOLIVAR.xlsx:', err.message);
    }
  }

  // 2. EPM BOLIVAR_2026.xlsx
  const f2 = path.join(rootDir, 'EPM BOLIVAR_2026.xlsx');
  if (fs.existsSync(f2)) {
    try {
      const wb = xlsx.readFile(f2);
      const sheet = wb.Sheets['Hoja1'] || wb.Sheets[wb.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      let placeholderCounter = 1;

      for (let i = 4; i < data.length; i++) {
        const r = data[i];
        if (!r || (!r[3] && !r[2])) continue;
        if (r[0] && String(r[0]).toUpperCase().includes('SECRETAR')) continue;

        let nombre = String(r[3] || '').trim().toUpperCase();
        let ciRaw = r[2] ? String(r[2]).replace(/[^0-9]/g, '') : '';
        if (!nombre && ciRaw === '28224735') {
          nombre = 'OSANA MUÑOZ';
        }
        if (!nombre) continue;

        let cedula = ciRaw;
        if (!cedula) {
          cedula = 'EPM-' + String(placeholderCounter++).padStart(2, '0');
        }

        let resp = String(r[5] || 'DIRECTOR POLITICO').trim().toUpperCase();
        let tlf = r[4] ? String(r[4]).trim() : '';

        allPersonas.push({
          cedula,
          nombre_apellido: nombre,
          municipio: 'BOLIVAR',
          comuna: 'EQUIPO POLITICO MUNICIPAL',
          comision: resp,
          telefono: tlf
        });
      }
    } catch (err) {
      console.error('Error leyendo EPM BOLIVAR_2026.xlsx:', err.message);
    }
  }

  // 3. LISTADOS JEFES DE UBCH Y COMANDO DE COMUNIDAD.xlsx
  const f3 = path.join(rootDir, 'LISTADOS JEFES DE UBCH Y COMANDO DE COMUNIDAD.xlsx');
  if (fs.existsSync(f3)) {
    try {
      const wb = xlsx.readFile(f3);
      const sheet = wb.Sheets['Hoja1'] || wb.Sheets[wb.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      let placeholderUbch = 1;

      for (let i = 1; i < data.length; i++) {
        const r = data[i];
        if (!r || !r[1]) continue;

        const ubch = String(r[0] || '').trim().toUpperCase();
        const nombre = String(r[1] || '').trim().toUpperCase();
        const tlf = String(r[2] || '').trim();

        // Buscar si ya existe cédula registrada con este teléfono o nombre
        const tlfClean = tlf.replace(/[^0-9]/g, '');
        let matched = null;
        if (tlfClean.length >= 7) {
          matched = allPersonas.find(p => p.telefono && p.telefono.replace(/[^0-9]/g, '').endsWith(tlfClean.slice(-7)));
        }
        if (!matched) {
          const parts = nombre.split(' ').filter(p => p.length > 3);
          matched = allPersonas.find(p => parts.length >= 2 && parts.every(w => p.nombre_apellido.includes(w)));
        }

        let cedula = matched ? matched.cedula : 'UBCH-' + String(placeholderUbch++).padStart(2, '0');

        allPersonas.push({
          cedula,
          nombre_apellido: nombre,
          municipio: 'BOLIVAR',
          comuna: 'JEFES DE UBCH',
          comision: ubch,
          telefono: tlf
        });
      }
    } catch (err) {
      console.error('Error leyendo LISTADOS JEFES DE UBCH Y COMANDO DE COMUNIDAD.xlsx:', err.message);
    }
  }

  return allPersonas;
}

module.exports = { parseAllPersonasFromExcels };
