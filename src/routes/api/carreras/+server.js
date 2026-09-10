import { createDatabase } from '$lib/database';

export async function GET({ request }) {
  const db = createDatabase();
  
  const search = new URL(request.url).searchParams.get('search') || '';
  
  let rows;
  if (search) {
    const stmt = db.prepare('SELECT * FROM carreras WHERE sigla LIKE ? OR nombre LIKE ?');
    rows = stmt.all(`%${search}%`, `%${search}%`);
  } else {
    rows = db.prepare('SELECT * FROM carreras').all();
  }
  
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