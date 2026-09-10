<script lang="ts">
  let file: File | null = $state(null);
  let dragging = $state(false);
  let uploading = $state(false);
  let result = $state(null);
  let error = $state(null);

  function onFiles(files: FileList | null) {
    if (!files || files.length===0) return;
    file = files[0];
    error = null; result = null;
  }

  async function subir() {
    if (!file) { error = 'Selecciona un archivo .xlsx'; return; }
    uploading = true; error = null; result = null;
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);
      const res = await fetch('/api/upload', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filename: file.name, data: b64 }) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Error');
      result = data;
      // refrescar si quieres
    } catch (e: any) {
      error = e.message;
    } finally { uploading = false; }
  }
</script>

<div class="max-w-3xl mx-auto">
  <div class="flex items-center justify-between mb-4">
    <h1 class="text-xl sm:text-2xl font-bold">Actualizar asignaciones</h1>
    <a href="/" class="text-sm text-blue-600 hover:underline">← Inicio</a>
  </div>
  <p class="text-sm text-gray-600 mb-4">Sube el archivo Excel <b>Asignaciones PTC</b> (mismo formato, hojas por carrera LCB, LI, etc.). Reemplaza la base de datos y se refleja al instante en <a href="/asignacion" class="text-blue-600 underline">/asignacion</a>. Funciona en computadora y teléfono.</p>

  <div
    class="rounded-xl border-2 border-dashed p-6 sm:p-8 text-center bg-white"
    class:border-blue-400={dragging}
    class:bg-blue-50={dragging}
    ondragenter={(e)=>{e.preventDefault(); dragging=true}}
    ondragover={(e)=>{e.preventDefault(); dragging=true}}
    ondragleave={()=> dragging=false}
    ondrop={(e)=>{e.preventDefault(); dragging=false; onFiles(e.dataTransfer?.files ?? null)}}
  >
    {#if file}
      <p class="font-medium text-sm">{file.name} <span class="text-gray-500">({(file.size/1024).toFixed(1)} KB)</span></p>
      <button onclick={()=> file=null} class="text-xs text-red-600 hover:underline mt-1">Quitar</button>
    {:else}
      <p class="text-sm text-gray-600">Arrastra el .xlsx aquí o</p>
      <label class="mt-3 inline-block bg-blue-600 text-white text-sm px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700">
        Seleccionar archivo
        <input type="file" accept=".xlsx,.xls" class="hidden" onchange={(e)=> onFiles((e.target as HTMLInputElement).files)} />
      </label>
      <p class="text-xs text-gray-400 mt-2">Formato: hojas LCB, LM, LO... con columnas Materia | Profesor asignado | PE-Adscripción | Horas</p>
    {/if}
  </div>

  <button onclick={subir} disabled={!file || uploading} class="mt-4 w-full sm:w-auto bg-green-600 disabled:bg-gray-300 text-white text-sm font-medium px-6 py-2.5 rounded-lg">
    {#if uploading}Subiendo...{:else}Actualizar ahora{/if}
  </button>

  {#if error}
    <p class="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
  {/if}
  {#if result}
    <div class="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
      <p class="text-sm font-medium text-green-800">✓ {result.message}</p>
      <p class="text-xs text-green-700 mt-1">Carreras: {result.counts.carreras} · Profesores: {result.counts.profesores} · Materias: {result.counts.materias} · Asignaciones: {result.counts.asignaciones}</p>
      <a href="/asignacion" class="inline-block mt-3 text-sm bg-white border px-4 py-2 rounded-lg hover:bg-gray-50">Ver asignaciones →</a>
      <a href="/asignacion?carrera=LI" class="inline-block mt-3 ml-2 text-sm text-blue-600 underline">Ver LI</a>
    </div>
  {/if}

  <div class="mt-8 text-xs text-gray-500 border-t pt-4">
    <p><b>Nota AWS VPS:</b> el archivo se guarda en <code>unsis.db</code> dentro del contenedor (volumen <code>./unsis.db:/app/unsis.db</code>). Al subir, se actualiza al instante sin reiniciar. Para respaldo, el Excel original no se guarda.</p>
  </div>
</div>
