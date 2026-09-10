import { createDatabase } from './database.js';
import pkg from 'xlsx';
const { read, utils } = pkg;

export function importFromBuffer(buffer) {
  const db = createDatabase();
  db.pragma('foreign_keys = OFF');

  // limpiar tablas (mantener carreras se reinsertan)
  db.exec('DELETE FROM asignaciones;');
  db.exec('DELETE FROM materias;');
  db.exec('DELETE FROM profesores;');
  try { db.exec("DELETE FROM sqlite_sequence WHERE name IN ('materias','profesores','asignaciones')"); } catch {}

  const carreras = [
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
  const insertCarrera = db.prepare('INSERT OR REPLACE INTO carreras (sigla, nombre) VALUES (?, ?)');
  carreras.forEach(([s, n]) => insertCarrera.run(s, n));
  // limpiar carreras obsoletas (LAM, DEP, etc.)
  db.exec(`DELETE FROM carreras WHERE sigla NOT IN ('LAP','LCB','LCE','LE','LGDM','LI','LM','LN','LO')`);

  const workbook = read(buffer, { type: 'buffer' });

  let totalMaterias = 0, totalProfs = 0, totalAsign = 0;
  const valid = new Set(carreras.map(c=>c[0]));

  for (const sheetName of workbook.SheetNames) {
    if (['Asignación-Profesor','GRUPOS UNSIS','usuario-profesor','AsigTotalPTC','Comisiones','Total-Grupos','MATERIAS','MATERIA','LAM','DEP'].includes(sheetName)) continue;
    if (!valid.has(sheetName)) continue;
    const carreraSigla = sheetName;
    const ws = workbook.Sheets[sheetName];
    const rows = utils.sheet_to_json(ws);
    if (!rows || rows.length < 3) continue;

    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      const clave = row.__EMPTY ? String(row.__EMPTY).trim() : '';
      const nombreProfesor = row.__EMPTY_1 ? String(row.__EMPTY_1).trim() : '';
      const adscripcion = row.__EMPTY_2 ? String(row.__EMPTY_2).trim() : '';
      const horasSemana = row.__EMPTY_3 !== undefined && row.__EMPTY_3 !== null ? Number(row.__EMPTY_3) : 0;
      if (!clave) continue;

      // materia
      let materiaId;
      const matExist = db.prepare('SELECT id FROM materias WHERE clave = ?').get(clave);
      if (matExist) materiaId = matExist.id;
      else {
        const r = db.prepare('INSERT INTO materias (clave, nombre, horas_semana, carrera, semestre, grupo, requiere_laboratorio, observaciones) VALUES (?,?,?,?,?,?,?,?)').run(clave, clave, horasSemana, carreraSigla, 26, null, 0, null);
        materiaId = r.lastInsertRowid; totalMaterias++;
      }

      // profesor
      let profesorId;
      if (!nombreProfesor) continue;
      const profExist = db.prepare('SELECT id FROM profesores WHERE nombre_completo = ?').get(nombreProfesor);
      if (profExist) profesorId = profExist.id;
      else {
        const r = db.prepare('INSERT INTO profesores (nombre_completo, adscripcion, horario_laboral, status, reincorporacion, observaciones) VALUES (?,?,?,?,?,?)').run(nombreProfesor, adscripcion || carreraSigla, null, 'Activo', null, null);
        profesorId = r.lastInsertRowid; totalProfs++;
      }

      const asignExist = db.prepare('SELECT id FROM asignaciones WHERE profesor_id = ? AND materia_id = ?').get(profesorId, materiaId);
      if (!asignExist) {
        db.prepare('INSERT INTO asignaciones (profesor_id, materia_id) VALUES (?,?)').run(profesorId, materiaId);
        totalAsign++;
      }
    }
  }

  db.pragma('foreign_keys = ON');
  const counts = {
    carreras: db.prepare('SELECT COUNT(*) as c FROM carreras').get().c,
    profesores: db.prepare('SELECT COUNT(*) as c FROM profesores').get().c,
    materias: db.prepare('SELECT COUNT(*) as c FROM materias').get().c,
    asignaciones: db.prepare('SELECT COUNT(*) as c FROM asignaciones').get().c,
  };
  db.close();
  return counts;
}
