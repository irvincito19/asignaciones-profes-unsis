import { json } from '@sveltejs/kit';
import { importFromBuffer } from '$lib/importExcel.js';

export async function POST({ request }) {
  return handleUpload(request);
}
export async function PUT({ request }) {
  return handleUpload(request);
}
async function handleUpload(request) {
  try {
    let buffer;
    let name = 'upload.xlsx';
    const ctype = request.headers.get('content-type') || '';
    if (ctype.includes('application/json')) {
      const body = await request.json();
      name = body.filename || name;
      if (!body.data) return json({ success: false, error: 'No se recibió data' }, { status: 400 });
      buffer = Buffer.from(body.data, 'base64');
    } else if (ctype.includes('multipart/form-data') || ctype.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!file || typeof file === 'string') {
        return json({ success: false, error: 'No se recibió archivo. Usa campo file' }, { status: 400 });
      }
      name = file.name || name;
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      // fallback: raw body
      const ab = await request.arrayBuffer();
      buffer = Buffer.from(ab);
      name = request.headers.get('x-filename') || name;
    }
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      return json({ success: false, error: 'Solo se permiten archivos .xlsx/.xls' }, { status: 400 });
    }
    if (!buffer || buffer.length === 0) return json({ success: false, error: 'Archivo vacío' }, { status: 400 });

    const counts = importFromBuffer(buffer);

    // opcional: guardar copia en disco para respaldo
    try {
      const fs = await import('node:fs');
      fs.writeFileSync('./unsis.db.bak', Buffer.from('')); // placeholder
    } catch {}

    return json({ success: true, message: `Actualizado: ${name}`, counts });
  } catch (e) {
    console.error('upload error', e);
    return json({ success: false, error: e.message || 'Error al procesar Excel' }, { status: 500 });
  }
}
