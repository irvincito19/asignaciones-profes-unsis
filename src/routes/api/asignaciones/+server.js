import { createDatabase } from '$lib/database';

export async function GET({ request }) {
  const db = createDatabase();
  
  const searchProfesor = new URL(request.url).searchParams.get('profesor') || '';
  const searchMateria = new URL(request.url).searchParams.get('materia') || '';
  const carrera = new URL(request.url).searchParams.get('carrera') || '';
  
  let query = `
    SELECT a.*, p.nombre_completo as profesor_nombre, p.adscripcion as profesor_adscripcion, m.clave as materia_clave, m.nombre as materia_nombre, m.horas_semana, m.carrera as materia_carrera, c.nombre as carrera_nombre
    FROM asignaciones a
    JOIN profesores p ON a.profesor_id = p.id
    JOIN materias m ON a.materia_id = m.id
    LEFT JOIN carreras c ON m.carrera = c.sigla
  `;
  const params = [];
  const conditions = [];
  
  if (searchProfesor) {
    conditions.push(' p.nombre_completo LIKE ?');
    params.push(`%${searchProfesor}%`);
  }
  
  if (searchMateria) {
    conditions.push('(m.clave LIKE ? OR m.nombre LIKE ?)');
    params.push(`%${searchMateria}%`, `%${searchMateria}%`);
  }
  
  if (carrera) {
    conditions.push(' m.carrera = ?');
    params.push(carrera);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY p.nombre_completo, m.nombre';
  
  const stmt = db.prepare(query);
  const rows = stmt.all(...params);
  
  db.close();
  
  return new Response(
    JSON.stringify({ success: true, data: rows }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}