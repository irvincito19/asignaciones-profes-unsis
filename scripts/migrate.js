import { createDatabase } from '../src/lib/database.js';
import pkg from 'xlsx';
import path from 'path';
const { readFile, utils } = pkg;

const EXCEL_PATH = path.resolve('./Asignaciones PTC- Semestre 26-27A (1).xlsx');

async function runMigration() {
  const db = createDatabase();
  // Desactivar restricciones FK temporalmente para la migración
  db.pragma('foreign_keys = OFF');

  // Semillas iniciales rectificadas 2026 - 9 licenciaturas UNSIS
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

  // Insertar carreras (REPLACE para rectificar nombres)
  const insertCarrera = db.prepare('INSERT OR REPLACE INTO carreras (sigla, nombre) VALUES (?, ?)');
  carreras.forEach(([sigla, nombre]) => insertCarrera.run(sigla, nombre));
  try { db.exec(`DELETE FROM carreras WHERE sigla NOT IN ('LAP','LCB','LCE','LE','LGDM','LI','LM','LN','LO')`); } catch {}

  // Leer el libro de trabajo
  const workbook = readFile(EXCEL_PATH);

  // Procesar cada hoja de carrera (solo 9 licenciaturas rectificadas)
  const validCarreras = new Set(carreras.map(c=>c[0]));
  for (const sheetName of workbook.SheetNames) {
    if (sheetName === 'Asignación-Profesor' || sheetName === 'GRUPOS UNSIS' ||
        sheetName === 'usuario-profesor' || sheetName === 'AsigTotalPTC' ||
        sheetName === 'Comisiones' || sheetName === 'Total-Grupos' || sheetName === 'MATERIAS' || sheetName === 'MATERIA' || sheetName === 'LAM' || sheetName === 'DEP') continue;
    if (!validCarreras.has(sheetName)) continue;

    // Determinar la carrera de la materia basándose en el nombre de la hoja
    const carreraSigla = sheetName; // La hoja corresponde a la carrera

    const worksheet = workbook.Sheets[sheetName];
    // Leer todas las filas sin especificar header, usa __EMPTY, __EMPTY_1, etc.
    const rows = utils.sheet_to_json(worksheet);

    if (!rows || rows.length < 3) continue;

    // Row 0 es el título general, Row 1 es la fila de encabezados del Excel
    // Datos empiezan a partir de la fila 2 (índice 2)

    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const clave = row.__EMPTY ? String(row.__EMPTY).trim() : '';
      const nombreProfesor = row.__EMPTY_1 ? String(row.__EMPTY_1).trim() : '';
      const adscripcion = row.__EMPTY_2 ? String(row.__EMPTY_2).trim() : '';
      const horasSemana = row.__EMPTY_3 !== undefined && row.__EMPTY_3 !== null ? Number(row.__EMPTY_3) : 0;
      const numeroAlumnos = row.__EMPTY_4 !== undefined && row.__EMPTY_4 !== null ? Number(row.__EMPTY_4) : 0;

      // Si no hay clave de materia, saltar
      if (!clave) continue;

      // 1. Insertar o obtener la materia
      const materiaExistente = db.prepare('SELECT id FROM materias WHERE clave = ?').get(clave);

      let materiaId;
      if (materiaExistente) {
        materiaId = materiaExistente.id;
      } else {
        const materiaNombre = clave; // Usar la clave como nombre si no hay nombre específico

        const result = db.prepare('INSERT INTO materias (clave, nombre, horas_semana, carrera, semestre, grupo, requiere_laboratorio, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
          clave,
          materiaNombre,
          horasSemana,
          carreraSigla,
          26, // Semestre actual
          null,
          0,
          null
        );
        materiaId = result.lastInsertRowid;
      }

      // 2. Insertar o obtener el profesor
      let profesorId;
      if (nombreProfesor) {
        const profesorExistente = db.prepare('SELECT id FROM profesores WHERE nombre_completo = ?').get(nombreProfesor);

        if (profesorExistente) {
          profesorId = profesorExistente.id;
        } else {
          const reincorporacion = null;
          const status = 'Activo';
          const horarioL = null;

          const result = db.prepare('INSERT INTO profesores (nombre_completo, adscripcion, horario_laboral, status, reincorporacion, observaciones) VALUES (?, ?, ?, ?, ?, ?)').run(
            nombreProfesor,
            adscripcion || carreraSigla,
            horarioL,
            status,
            reincorporacion,
            null
          );
          profesorId = result.lastInsertRowid;
        }
      } else {
        continue;
      }

      // 3. Insertar la asignación si no existe
      const asignacionExistente = db.prepare('SELECT id FROM asignaciones WHERE profesor_id = ? AND materia_id = ?').get(profesorId, materiaId);

      if (!asignacionExistente) {
        db.prepare('INSERT INTO asignaciones (profesor_id, materia_id) VALUES (?, ?)').run(profesorId, materiaId);
      }
    }
  }

  console.log('Migración completada exitosamente');

  // Reactivar restricciones FK
  db.pragma('foreign_keys = ON');

  db.close();
}

runMigration().catch(err => {
  console.error('Error durante la migración:', err);
  process.exit(1);
});