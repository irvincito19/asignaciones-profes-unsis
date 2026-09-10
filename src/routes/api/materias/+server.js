import { createDatabase } from '$lib/database';

export async function GET({ request }) {
  const db = createDatabase();
  
  const search = new URL(request.url).searchParams.get('search') || '';
  const carrera = new URL(request.url).searchParams.get('carrera') || '';
  const requiere_laboratorio = new URL(request.url).searchParams.get('laboratorio');
  
  let query = 'SELECT m.*, c.nombre as carrera_nombre FROM materias m LEFT JOIN carreras c ON m.carrera = c.sigla';
  const params = [];
  const conditions = [];

  if (search) {
    conditions.push('(m.clave LIKE ? OR m.nombre LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (carrera) {
    conditions.push('m.carrera = ?');
    params.push(carrera);
  }

  if (requiere_laboratorio !== null) {
    conditions.push('m.requiere_laboratorio = ?');
    params.push(requiere_laboratorio === 'true' ? 1 : 0);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
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