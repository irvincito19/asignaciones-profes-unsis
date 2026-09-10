import { createDatabase } from '$lib/database';

export async function GET({ request }) {
  const db = createDatabase();
  
  const search = new URL(request.url).searchParams.get('search') || '';
  const carrera = new URL(request.url).searchParams.get('carrera') || '';
  
  let query = 'SELECT * FROM profesores';
  const params = [];
  const conditions = [];

  if (search) {
    conditions.push('nombre_completo LIKE ?');
    params.push(`%${search}%`);
  }

  if (carrera) {
    conditions.push('adscripcion = ?');
    params.push(carrera);
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