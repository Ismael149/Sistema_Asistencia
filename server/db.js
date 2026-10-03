const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const xlsx = require('xlsx');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new Database(dbPath);

// Enable foreign keys & WAL mode for speed & safety
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function initDatabase() {
  console.log('📦 Inicializando Base de Datos SQLite en:', dbPath);

  // 1. Usuarios
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nombre TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'operador',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Personas (Cargadas desde Excel)
  db.exec(`
    CREATE TABLE IF NOT EXISTS personas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cedula TEXT UNIQUE NOT NULL,
      nombre_apellido TEXT NOT NULL,
      municipio TEXT,
      comuna TEXT,
      comision TEXT,
      telefono TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Eventos
  db.exec(`
    CREATE TABLE IF NOT EXISTS eventos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      lugar TEXT,
      fecha TEXT NOT NULL, -- YYYY-MM-DD
      hora_inicio TEXT, -- HH:MM
      hora_fin TEXT, -- HH:MM
      categoria TEXT DEFAULT 'General',
      estado TEXT DEFAULT 'programado', -- programado, en_curso, finalizado, cancelado
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 4. Asistencias Encabezado / Lista
  db.exec(`
    CREATE TABLE IF NOT EXISTS asistencias_lista (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evento_id INTEGER NOT NULL,
      nombre_lista TEXT NOT NULL,
      fecha_guardado TEXT NOT NULL, -- YYYY-MM-DD
      hora_guardado TEXT NOT NULL, -- HH:MM:SS
      usuario_id INTEGER,
      usuario_nombre TEXT,
      observaciones TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE
    )
  `);

  // 5. Asistencias Detalle por Persona
  db.exec(`
    CREATE TABLE IF NOT EXISTS asistencias_detalle (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asistencia_lista_id INTEGER NOT NULL,
      evento_id INTEGER NOT NULL,
      persona_id INTEGER NOT NULL,
      asistio INTEGER NOT NULL DEFAULT 0, -- 1: Sí, 0: No
      observacion TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asistencia_lista_id) REFERENCES asistencias_lista(id) ON DELETE CASCADE,
      FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE,
      FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
      UNIQUE(asistencia_lista_id, persona_id)
    )
  `);

  // 6. Bitácora del Sistema
  db.exec(`
    CREATE TABLE IF NOT EXISTS bitacora (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      usuario_nombre TEXT NOT NULL,
      rol TEXT NOT NULL,
      accion TEXT NOT NULL,
      detalle TEXT NOT NULL,
      ip TEXT,
      fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sembrar Usuarios por defecto
  seedUsers();

  // Sembrar Personas desde el archivo Excel
  seedPersonasFromExcel();

  // Sembrar eventos de ejemplo si está vacío
  seedSampleEvents();
}

function seedUsers() {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM usuarios');
  const { count } = countStmt.get();

  if (count === 0) {
    console.log('👤 Creando usuarios iniciales (Admin y Operador)...');
    const salt = bcrypt.genSaltSync(10);
    const adminPass = bcrypt.hashSync('admin123', salt);
    const opPass = bcrypt.hashSync('operador123', salt);

    const insertUser = db.prepare(`
      INSERT INTO usuarios (username, password_hash, nombre, rol)
      VALUES (?, ?, ?, ?)
    `);

    insertUser.run('admin', adminPass, 'Administrador del Sistema', 'admin');
    insertUser.run('operador', opPass, 'Operador de Asistencia', 'operador');

    // Registrar en Bitácora
    db.prepare(`
      INSERT INTO bitacora (usuario_id, usuario_nombre, rol, accion, detalle)
      VALUES (1, 'Sistema', 'SYSTEM', 'INICIALIZACION', 'Creación inicial de usuarios por defecto (admin y operador).')
    `).run();
  }
}

function seedPersonasFromExcel() {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM personas');
  const { count } = countStmt.get();

  if (count > 0) {
    console.log(`ℹ️ La base de datos ya contiene ${count} personas.`);
    return;
  }

  const excelPath = path.join(__dirname, '../Equipos Comunales PSUV BOLIVAR.xlsx');
  if (!fs.existsSync(excelPath)) {
    console.warn('⚠️ No se encontró el archivo Excel "Equipos Comunales PSUV BOLIVAR.xlsx" para sembrar personas.');
    return;
  }

  console.log('📊 Leyendo datos desde Equipos Comunales PSUV BOLIVAR.xlsx...');
  try {
    const workbook = xlsx.readFile(excelPath);
    const insertPersona = db.prepare(`
      INSERT OR IGNORE INTO personas (cedula, nombre_apellido, municipio, comuna, comision, telefono)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    let importedCount = 0;

    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        insertPersona.run(
          row.cedula,
          row.nombre_apellido,
          row.municipio,
          row.comuna,
          row.comision,
          row.telefono
        );
        importedCount++;
      }
    });

    const rowsToInsert = [];

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

      let headerIdx = -1;
      for (let i = 0; i < data.length; i++) {
        const rowStr = (data[i] || []).map(c => String(c)).join(' ').toUpperCase();
        if (rowStr.includes('NOMBRE') || rowStr.includes('CEDULA')) {
          headerIdx = i;
          break;
        }
      }

      if (headerIdx !== -1) {
        for (let j = headerIdx + 1; j < data.length; j++) {
          const r = data[j];
          if (!r || r.length < 3) continue;

          // Standard columns: MUNICIPIO (0), COMUNA (2), COMISION (4), NOMBRE (6), CEDULA (8), TELEFONO (10)
          // Let's also do fallback matching by header indices if needed
          let municipio = (r[0] || '').toString().trim();
          let comuna = (r[2] || sheetName.trim()).toString().trim();
          let comision = (r[4] || '').toString().trim();
          let nombre = (r[6] || r[5] || r[1] || '').toString().trim();
          let cedulaRaw = r[8] || r[7] || r[2];
          let telefonoRaw = r[10] || r[9] || r[3] || '';

          // Validate name and cedula
          if (!nombre || nombre.toUpperCase().includes('NOMBRE') || nombre.toUpperCase().includes('COMUNA')) continue;

          let cedula = cedulaRaw ? String(cedulaRaw).replace(/[^0-9]/g, '') : '';
          if (!cedula) continue; // skip invalid cedulas

          let telefono = telefonoRaw ? String(telefonoRaw).trim() : '';

          rowsToInsert.push({
            cedula,
            nombre_apellido: nombre.toUpperCase(),
            municipio: municipio || 'BOLIVAR',
            comuna: comuna || sheetName.trim(),
            comision: comision || 'GENERAL',
            telefono: telefono
          });
        }
      }
    });

    insertMany(rowsToInsert);

    console.log(`✅ ¡Se importaron con éxito ${importedCount} personas desde el archivo Excel!`);

    // Log to bitácora
    db.prepare(`
      INSERT INTO bitacora (usuario_id, usuario_nombre, rol, accion, detalle)
      VALUES (1, 'Sistema', 'SYSTEM', 'IMPORTACION_EXCEL', 'Importación masiva inicial de ${importedCount} personas desde Equipos Comunales PSUV BOLIVAR.xlsx')
    `).run();

  } catch (err) {
    console.error('❌ Error al procesar el archivo Excel:', err);
  }
}

function seedSampleEvents() {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM eventos');
  const { count } = countStmt.get();

  if (count === 0) {
    console.log('📅 Creando eventos de prueba en el calendario...');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const insertEvent = db.prepare(`
      INSERT INTO eventos (titulo, descripcion, lugar, fecha, hora_inicio, hora_fin, categoria, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertEvent.run(
      'Asamblea General Comunitaria PSUV',
      'Reunión extraordinaria con todos los voceros y coordinadores comunales.',
      'Cancha de San Mateo',
      todayStr,
      '09:00',
      '12:00',
      'Asamblea',
      'programado'
    );

    insertEvent.run(
      'Taller de Formación Política e Integral',
      'Jornada de capacitación para comisiones organizativas.',
      'Casa de la Cultura - Antonio Ricaurte',
      todayStr,
      '14:00',
      '17:00',
      'Formación',
      'programado'
    );

    // One event for tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tYyyy = tomorrow.getFullYear();
    const tMm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const tDd = String(tomorrow.getDate()).padStart(2, '0');
    const tomorrowStr = `${tYyyy}-${tMm}-${tDd}`;

    insertEvent.run(
      'Despliegue de Estrategia Electoral',
      'Chequeo de estructuras comunales y plan de trabajo de campo.',
      'Sede Comunal Ezequiel Zamora',
      tomorrowStr,
      '08:30',
      '11:30',
      'Electoral',
      'programado'
    );
  }
}

// Call init on module load
initDatabase();

module.exports = db;
