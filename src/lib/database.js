import Database from 'better-sqlite3';

export function createDatabase(dbPath = './unsis.db') {
  const db = new Database(dbPath);

  // Tabla de carreras
  db.exec(`
    CREATE TABLE IF NOT EXISTS carreras (
      sigla TEXT PRIMARY KEY,
      nombre TEXT
    );
  `);
  // Semilla actualizada 2026 - 9 licenciaturas UNSIS
  const carrerasSeed = [
    ['LAP', 'Licenciatura en Administración Pública'],
    ['LCB', 'Licenciatura en Ciencias Biomédicas'],
    ['LCE', 'Licenciatura en Ciencias Empresariales'],
    ['LE', 'Licenciatura en Enfermería'],
    ['LGDM', 'Licenciatura en Gobierno y Desarrollo Municipal'],
    ['LI', 'Licenciatura en Informática'],
    ['LM', 'Licenciatura en Medicina'],
    ['LN', 'Licenciatura en Nutrición'],
    ['LO', 'Licenciatura en Odontología'],
  ];
  const _ins = db.prepare('INSERT OR REPLACE INTO carreras (sigla, nombre) VALUES (?, ?)');
  carrerasSeed.forEach(([s,n])=> _ins.run(s,n));
  try { db.exec(`DELETE FROM carreras WHERE sigla NOT IN ('LAP','LCB','LCE','LE','LGDM','LI','LM','LN','LO')`); } catch {}

  // Tabla de profesores
  db.exec(`
    CREATE TABLE IF NOT EXISTS profesores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_completo TEXT NOT NULL,
      adscripcion TEXT,
      horario_laboral TEXT,
      status TEXT,
      reincorporacion TEXT,
      observaciones TEXT
    );
  `);

  // Tabla de materias
  db.exec(`
    CREATE TABLE IF NOT EXISTS materias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clave TEXT NOT NULL,
      nombre TEXT NOT NULL,
      horas_semana REAL,
      carrera TEXT NOT NULL,
      semestre INTEGER,
      grupo TEXT,
      requiere_laboratorio BOOLEAN DEFAULT 0,
      observaciones TEXT,
      FOREIGN KEY (carrera) REFERENCES carreras(sigla)
    );
  `);

  // Tabla de asignaciones
  db.exec(`
    CREATE TABLE IF NOT EXISTS asignaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profesor_id INTEGER NOT NULL,
      materia_id INTEGER NOT NULL,
      FOREIGN KEY (profesor_id) REFERENCES profesores(id) ON DELETE CASCADE,
      FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE
    );
  `);

  // Índices
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_asignaciones_profesor ON asignaciones(profesor_id);
    CREATE INDEX IF NOT EXISTS idx_asignaciones_materia ON asignaciones(materia_id);
    CREATE INDEX IF NOT EXISTS idx_materias_carrera ON materias(carrera);
  `);

  return db;
}

export default createDatabase;