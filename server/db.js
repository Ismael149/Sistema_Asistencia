const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { parseAllPersonasFromExcels } = require('./services/excelImporter');

let db;
const isPostgres = !!process.env.DATABASE_URL;

if (isPostgres) {
  console.log('🌐 Detectada variable DATABASE_URL. Usando PostgreSQL (Supabase / Cloud)...');
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  // Convert ? placeholders to $1, $2, $3... for PostgreSQL
  function formatPgSql(sql) {
    let index = 1;
    let formatted = sql.replace(/\?/g, () => `$${index++}`);
    if (sql.includes('INSERT OR IGNORE INTO personas')) {
      formatted = formatted.replace(/INSERT OR IGNORE INTO personas/gi, 'INSERT INTO personas');
      formatted += ' ON CONFLICT (cedula, comuna) DO NOTHING';
    } else {
      formatted = formatted.replace(/INSERT OR IGNORE INTO/gi, 'INSERT INTO');
    }
    return formatted;
  }

  db = {
    isPg: true,
    pool,
    prepare(sql) {
      const pgSql = formatPgSql(sql);
      return {
        async get(...params) {
          try {
            const res = await pool.query(pgSql, params.flat());
            return res.rows[0] || undefined;
          } catch (err) {
            console.error('PG Query Error (get):', err.message, 'SQL:', pgSql);
            throw err;
          }
        },
        async all(...params) {
          try {
            const res = await pool.query(pgSql, params.flat());
            return res.rows;
          } catch (err) {
            console.error('PG Query Error (all):', err.message, 'SQL:', pgSql);
            throw err;
          }
        },
        async run(...params) {
          try {
            let finalSql = pgSql;
            if (/INSERT\s+INTO/i.test(finalSql) && !/RETURNING/i.test(finalSql) && !/ON CONFLICT/i.test(finalSql)) {
              finalSql += ' RETURNING id';
            }
            const res = await pool.query(finalSql, params.flat());
            const lastInsertRowid = res.rows && res.rows[0] ? res.rows[0].id : null;
            return {
              changes: res.rowCount,
              lastInsertRowid
            };
          } catch (err) {
            console.error('PG Query Error (run):', err.message, 'SQL:', pgSql);
            throw err;
          }
        }
      };
    },
    transaction(fn) {
      return async (...args) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const originalPrepare = db.prepare;
          db.prepare = (sql) => {
            const pgSql = formatPgSql(sql);
            return {
              async get(...params) {
                const res = await client.query(pgSql, params.flat());
                return res.rows[0] || undefined;
              },
              async all(...params) {
                const res = await client.query(pgSql, params.flat());
                return res.rows;
              },
              async run(...params) {
                let finalSql = pgSql;
                if (/INSERT\s+INTO/i.test(finalSql) && !/RETURNING/i.test(finalSql) && !/ON CONFLICT/i.test(finalSql)) {
                  finalSql += ' RETURNING id';
                }
                const res = await client.query(finalSql, params.flat());
                return {
                  changes: res.rowCount,
                  lastInsertRowid: res.rows && res.rows[0] ? res.rows[0].id : null
                };
              }
            };
          };

          const result = await fn(...args);
          await client.query('COMMIT');
          db.prepare = originalPrepare;
          return result;
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      };
    }
  };

  initPostgresDatabase();

} else {
  console.log('📦 Modo Local: Usando SQLite...');
  const Database = require('better-sqlite3');
  const dbPath = path.join(__dirname, '../database.sqlite');
  const sqliteDb = new Database(dbPath);

  sqliteDb.pragma('foreign_keys = ON');
  sqliteDb.pragma('journal_mode = WAL');

  db = {
    isPg: false,
    sqliteDb,
    prepare(sql) {
      const stmt = sqliteDb.prepare(sql);
      return {
        get: (...params) => stmt.get(...params.flat()),
        all: (...params) => stmt.all(...params.flat()),
        run: (...params) => stmt.run(...params.flat())
      };
    },
    transaction(fn) {
      return sqliteDb.transaction(fn);
    }
  };

  initSqliteDatabase(sqliteDb);
}

// -------------------------------------------------------------
// POSTGRES INIT
// -------------------------------------------------------------
async function initPostgresDatabase() {
  console.log('🚀 Inicializando Tablas en PostgreSQL...');

  try {
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        nombre TEXT NOT NULL,
        rol VARCHAR(50) NOT NULL DEFAULT 'operador',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS personas (
        id SERIAL PRIMARY KEY,
        cedula VARCHAR(255) NOT NULL,
        nombre_apellido TEXT NOT NULL,
        municipio TEXT,
        comuna TEXT,
        comision TEXT,
        telefono TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_persona_comuna UNIQUE(cedula, comuna)
      );

      CREATE TABLE IF NOT EXISTS eventos (
        id SERIAL PRIMARY KEY,
        titulo TEXT NOT NULL,
        descripcion TEXT,
        lugar TEXT,
        fecha VARCHAR(50) NOT NULL,
        hora_inicio VARCHAR(50),
        hora_fin VARCHAR(50),
        categoria VARCHAR(100) DEFAULT 'General',
        estado VARCHAR(50) DEFAULT 'programado',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS asistencias_lista (
        id SERIAL PRIMARY KEY,
        evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
        nombre_lista TEXT NOT NULL,
        fecha_guardado VARCHAR(50) NOT NULL,
        hora_guardado VARCHAR(50) NOT NULL,
        usuario_id INTEGER,
        usuario_nombre TEXT,
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS asistencias_detalle (
        id SERIAL PRIMARY KEY,
        asistencia_lista_id INTEGER NOT NULL REFERENCES asistencias_lista(id) ON DELETE CASCADE,
        evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
        persona_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
        asistio INTEGER NOT NULL DEFAULT 0,
        observacion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_asistencia_persona UNIQUE(asistencia_lista_id, persona_id)
      );

      CREATE TABLE IF NOT EXISTS bitacora (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER,
        usuario_nombre TEXT NOT NULL,
        rol VARCHAR(50) NOT NULL,
        accion TEXT NOT NULL,
        detalle TEXT NOT NULL,
        ip TEXT,
        fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // In case the personas table in PG was previously created with UNIQUE(cedula)
    try {
      await db.pool.query(`
        ALTER TABLE personas DROP CONSTRAINT IF EXISTS personas_cedula_key;
        ALTER TABLE personas ADD CONSTRAINT unique_persona_comuna UNIQUE (cedula, comuna);
      `);
    } catch (e) {
      // Constraint might already exist
    }

    await seedUsers();
    await seedPersonasFromExcel();
    await seedSampleEvents();

    console.log('✅ Base de datos PostgreSQL inicializada con éxito.');
  } catch (err) {
    console.error('❌ Error al inicializar PostgreSQL:', err);
  }
}

// -------------------------------------------------------------
// SQLITE INIT
// -------------------------------------------------------------
function initSqliteDatabase(sqliteDb) {
  console.log('📦 Inicializando Base de Datos SQLite...');

  // Ensure personas table has UNIQUE(cedula, comuna)
  const personasTable = sqliteDb.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='personas'").get();
  if (personasTable && !personasTable.sql.includes('UNIQUE(cedula, comuna)') && !personasTable.sql.includes('UNIQUE (cedula, comuna)')) {
    console.log('🔄 Actualizando restricción de tabla personas a UNIQUE(cedula, comuna)...');
    sqliteDb.pragma('foreign_keys = OFF');
    sqliteDb.exec(`
      CREATE TABLE personas_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cedula TEXT NOT NULL,
        nombre_apellido TEXT NOT NULL,
        municipio TEXT,
        comuna TEXT,
        comision TEXT,
        telefono TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(cedula, comuna)
      );
      INSERT INTO personas_new (id, cedula, nombre_apellido, municipio, comuna, comision, telefono, created_at, updated_at)
      SELECT id, cedula, nombre_apellido, municipio, comuna, comision, telefono, created_at, updated_at FROM personas;
      DROP TABLE personas;
      ALTER TABLE personas_new RENAME TO personas;
    `);
    sqliteDb.pragma('foreign_keys = ON');
  }

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nombre TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'operador',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS personas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cedula TEXT NOT NULL,
      nombre_apellido TEXT NOT NULL,
      municipio TEXT,
      comuna TEXT,
      comision TEXT,
      telefono TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(cedula, comuna)
    );

    CREATE TABLE IF NOT EXISTS eventos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      lugar TEXT,
      fecha TEXT NOT NULL,
      hora_inicio TEXT,
      hora_fin TEXT,
      categoria TEXT DEFAULT 'General',
      estado TEXT DEFAULT 'programado',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS asistencias_lista (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evento_id INTEGER NOT NULL,
      nombre_lista TEXT NOT NULL,
      fecha_guardado TEXT NOT NULL,
      hora_guardado TEXT NOT NULL,
      usuario_id INTEGER,
      usuario_nombre TEXT,
      observaciones TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS asistencias_detalle (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asistencia_lista_id INTEGER NOT NULL,
      evento_id INTEGER NOT NULL,
      persona_id INTEGER NOT NULL,
      asistio INTEGER NOT NULL DEFAULT 0,
      observacion TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asistencia_lista_id) REFERENCES asistencias_lista(id) ON DELETE CASCADE,
      FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE,
      FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
      UNIQUE(asistencia_lista_id, persona_id)
    );

    CREATE TABLE IF NOT EXISTS bitacora (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      usuario_nombre TEXT NOT NULL,
      rol TEXT NOT NULL,
      accion TEXT NOT NULL,
      detalle TEXT NOT NULL,
      ip TEXT,
      fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedUsersSync();
  seedPersonasFromExcelSync();
  seedSampleEventsSync();
}

// -------------------------------------------------------------
// SEEDERS
// -------------------------------------------------------------
async function seedUsers() {
  const { count } = await db.prepare('SELECT COUNT(*) as count FROM usuarios').get();

  if (parseInt(count || 0) === 0) {
    console.log('👤 Creando usuarios iniciales en la nube (Admin y Operador)...');
    const salt = bcrypt.genSaltSync(10);
    const adminPass = bcrypt.hashSync('admin123', salt);
    const opPass = bcrypt.hashSync('operador123', salt);

    await db.prepare(`
      INSERT INTO usuarios (username, password_hash, nombre, rol)
      VALUES (?, ?, ?, ?)
    `).run('admin', adminPass, 'Administrador del Sistema', 'admin');

    await db.prepare(`
      INSERT INTO usuarios (username, password_hash, nombre, rol)
      VALUES (?, ?, ?, ?)
    `).run('operador', opPass, 'Operador de Asistencia', 'operador');

    await db.prepare(`
      INSERT INTO bitacora (usuario_id, usuario_nombre, rol, accion, detalle)
      VALUES (1, 'Sistema', 'SYSTEM', 'INICIALIZACION', 'Creación inicial de usuarios por defecto (admin y operador).')
    `).run();
  }
}

function seedUsersSync() {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM usuarios').get();

  if (parseInt(count || 0) === 0) {
    console.log('👤 Creando usuarios iniciales (Admin y Operador)...');
    const salt = bcrypt.genSaltSync(10);
    const adminPass = bcrypt.hashSync('admin123', salt);
    const opPass = bcrypt.hashSync('operador123', salt);

    db.prepare(`
      INSERT INTO usuarios (username, password_hash, nombre, rol)
      VALUES (?, ?, ?, ?)
    `).run('admin', adminPass, 'Administrador del Sistema', 'admin');

    db.prepare(`
      INSERT INTO usuarios (username, password_hash, nombre, rol)
      VALUES (?, ?, ?, ?)
    `).run('operador', opPass, 'Operador de Asistencia', 'operador');

    db.prepare(`
      INSERT INTO bitacora (usuario_id, usuario_nombre, rol, accion, detalle)
      VALUES (1, 'Sistema', 'SYSTEM', 'INICIALIZACION', 'Creación inicial de usuarios por defecto (admin y operador).')
    `).run();
  }
}

async function seedPersonasFromExcel() {
  console.log('📊 Verificando e importando personas de los archivos Excel...');
  try {
    const personas = parseAllPersonasFromExcels();
    let importedCount = 0;

    for (const p of personas) {
      try {
        const res = await db.prepare(`
          INSERT OR IGNORE INTO personas (cedula, nombre_apellido, municipio, comuna, comision, telefono)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          p.cedula,
          p.nombre_apellido,
          p.municipio || 'BOLIVAR',
          p.comuna,
          p.comision || 'GENERAL',
          p.telefono || ''
        );
        if (res.changes > 0) importedCount++;
      } catch (e) {
        // Ignorar duplicados
      }
    }

    if (importedCount > 0) {
      console.log(`✅ ¡Se importaron ${importedCount} nuevas personas desde los archivos Excel a la base de datos!`);
      await db.prepare(`
        INSERT INTO bitacora (usuario_id, usuario_nombre, rol, accion, detalle)
        VALUES (1, 'Sistema', 'SYSTEM', 'IMPORTACION_EXCEL', 'Importación de ${importedCount} personas desde los archivos Excel (Equipos Comunales, EPM, Jefes de UBCH).')
      `).run();
    } else {
      console.log('ℹ️ Todos los registros de las hojas Excel ya se encuentran en la base de datos.');
    }
  } catch (err) {
    console.error('❌ Error al procesar archivos Excel:', err);
  }
}

function seedPersonasFromExcelSync() {
  console.log('📊 Verificando e importando personas de los archivos Excel (Local)...');
  try {
    const personas = parseAllPersonasFromExcels();
    const insertPersona = db.prepare(`
      INSERT OR IGNORE INTO personas (cedula, nombre_apellido, municipio, comuna, comision, telefono)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    let importedCount = 0;
    const insertMany = db.transaction((rows) => {
      for (const p of rows) {
        const res = insertPersona.run(
          p.cedula,
          p.nombre_apellido,
          p.municipio || 'BOLIVAR',
          p.comuna,
          p.comision || 'GENERAL',
          p.telefono || ''
        );
        if (res.changes > 0) importedCount++;
      }
    });

    insertMany(personas);

    if (importedCount > 0) {
      console.log(`✅ ¡Se importaron ${importedCount} nuevas personas desde los archivos Excel!`);
      db.prepare(`
        INSERT INTO bitacora (usuario_id, usuario_nombre, rol, accion, detalle)
        VALUES (1, 'Sistema', 'SYSTEM', 'IMPORTACION_EXCEL', 'Importación de ${importedCount} personas desde los archivos Excel (Equipos Comunales, EPM, Jefes de UBCH).')
      `).run();
    } else {
      console.log('ℹ️ Todos los registros de las hojas Excel ya se encuentran en la base de datos local.');
    }
  } catch (err) {
    console.error('❌ Error al procesar archivos Excel local:', err);
  }
}

async function seedSampleEvents() {
  const { count } = await db.prepare('SELECT COUNT(*) as count FROM eventos').get();

  if (parseInt(count || 0) === 0) {
    console.log('📅 Creando eventos de prueba en el calendario...');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    await db.prepare(`
      INSERT INTO eventos (titulo, descripcion, lugar, fecha, hora_inicio, hora_fin, categoria, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Asamblea General Comunitaria PSUV',
      'Reunión extraordinaria con todos los voceros y coordinadores comunales.',
      'Cancha de San Mateo',
      todayStr,
      '09:00',
      '12:00',
      'Asamblea',
      'programado'
    );

    await db.prepare(`
      INSERT INTO eventos (titulo, descripcion, lugar, fecha, hora_inicio, hora_fin, categoria, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Taller de Formación Política e Integral',
      'Jornada de capacitación para comisiones organizativas.',
      'Casa de la Cultura - Antonio Ricaurte',
      todayStr,
      '14:00',
      '17:00',
      'Formación',
      'programado'
    );
  }
}

function seedSampleEventsSync() {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM eventos').get();

  if (parseInt(count || 0) === 0) {
    console.log('📅 Creando eventos de prueba en el calendario...');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    db.prepare(`
      INSERT INTO eventos (titulo, descripcion, lugar, fecha, hora_inicio, hora_fin, categoria, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Asamblea General Comunitaria PSUV',
      'Reunión extraordinaria con todos los voceros y coordinadores comunales.',
      'Cancha de San Mateo',
      todayStr,
      '09:00',
      '12:00',
      'Asamblea',
      'programado'
    );
  }
}

module.exports = db;
