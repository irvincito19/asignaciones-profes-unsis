<script lang="ts">
  import { onMount } from 'svelte';

  let carreraSigla = $state('');
  let carreras = $state([]);
  let profesoresCarrera = $state([]);
  let todasAsignaciones = $state([]);
  let q = $state('');
  let loading = $state(true);
  let error = $state(null);

  const CARRERAS_SIGLAS = ['LAP','LCB','LCE','LE','LGDM','LI','LM','LN','LO'];

  async function cargar(sigla: string) {
    loading = true;
    try {
      const [cRes, pRes, aRes] = await Promise.all([
        fetch('/api/carreras').then(r=>r.json()),
        fetch(`/api/profesores${sigla ? `?carrera=${sigla}` : ''}`).then(r=>r.json()),
        fetch('/api/asignaciones').then(r=>r.json())
      ]);
      carreras = cRes.data || [];
      profesoresCarrera = pRes.data || [];
      todasAsignaciones = aRes.data || [];
    } catch (e) {
      error = 'Error al cargar';
      console.error(e);
    } finally { loading = false; }
  }

  onMount(async () => {
    carreraSigla = new URL(window.location.href).searchParams.get('carrera') || '';
    await cargar(carreraSigla);
  });

  async function cambiarCarrera(sigla: string) {
    carreraSigla = sigla;
    const url = new URL(window.location.href);
    if (sigla) url.searchParams.set('carrera', sigla);
    else url.searchParams.delete('carrera');
    history.replaceState({}, '', url);
    await cargar(sigla);
  }

  // Profesores de esa carrera + todas sus materias (en todas las carreras)
  let grupos = $derived.by(() => {
    // mapa id -> profesor base
    const profMap = new Map(profesoresCarrera.map(p => [p.id, p]));
    const asignPorProf = new Map();
    for (const a of todasAsignaciones) {
      if (!profMap.has(a.profesor_id)) continue;
      if (q) {
        const ql = q.toLowerCase();
        if (!a.profesor_nombre.toLowerCase().includes(ql) && !a.materia_nombre.toLowerCase().includes(ql) && !a.materia_clave.toLowerCase().includes(ql)) continue;
      }
      if (!asignPorProf.has(a.profesor_id)) asignPorProf.set(a.profesor_id, []);
      asignPorProf.get(a.profesor_id).push(a);
    }
    // si hay búsqueda y profesor no tiene materias coincidentes pero su nombre coincide, mostrarlo aunque sea sin materias filtradas? Ya filtra arriba.
    // Incluir profesores sin materias si coinciden búsqueda por nombre
    if (q) {
      for (const p of profesoresCarrera) {
        if (!asignPorProf.has(p.id) && p.nombre_completo.toLowerCase().includes(q.toLowerCase())) {
          asignPorProf.set(p.id, []);
        }
      }
    } else {
      // incluir profesores aunque no tengan asignación (raro) para que se vean
      for (const p of profesoresCarrera) if (!asignPorProf.has(p.id)) asignPorProf.set(p.id, []);
    }
    const res = [];
    for (const [pid, materias] of asignPorProf) {
      const p = profMap.get(pid);
      res.push({ id: pid, nombre: p.nombre_completo, adscripcion: p.adscripcion, materias: materias.sort((a,b)=> a.materia_nombre.localeCompare(b.materia_nombre)) });
    }
    // si q filtra y no hay carrera, también buscar profesores que tengan materia coincidente pero no están en la lista? Ya filtrado por carrera, así que solo los de esa carrera.
    return res.sort((a,b)=> a.nombre.localeCompare(b.nombre));
  });

  let totalMaterias = $derived(grupos.reduce((s,g)=> s+g.materias.length,0));
</script>

<div class="max-w-6xl mx-auto">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
    <h1 class="text-xl sm:text-2xl font-bold">Profesores por carrera y sus materias</h1>
    <a href="/" class="text-sm text-blue-600 hover:underline self-start sm:self-auto">← Volver a carreras</a>
  </div>
  <p class="text-xs sm:text-sm text-gray-600 mb-4">Selecciona una carrera para ver los <b>profesores adscritos a esa carrera</b> y <b>todas las materias que imparten</b> (aunque sean de otras carreras).</p>

  <div class="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 mb-4 shadow-sm">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <label class="text-sm font-medium whitespace-nowrap">Ver carrera:</label>
      <select value={carreraSigla} onchange={(e)=> cambiarCarrera((e.target as HTMLSelectElement).value)} class="w-full sm:w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
        <option value="">Todas las carreras</option>
        {#each CARRERAS_SIGLAS as sig}
          <option value={sig}>{sig} - {carreras.find(c=>c.sigla===sig)?.nombre ?? sig}</option>
        {/each}
      </select>
      <input bind:value={q} placeholder="Buscar profesor o materia..." class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
    </div>
    {#if carreraSigla}
      <p class="mt-2 text-xs text-gray-500"><b>{carreraSigla}</b>: {profesoresCarrera.length} profesores adscritos · {totalMaterias} materias asignadas en total (todas las carreras)</p>
    {:else}
      <p class="mt-2 text-xs text-gray-500">{profesoresCarrera.length} profesores · {totalMaterias} materias asignadas</p>
    {/if}
  </div>

  {#if loading}
    <p class="text-sm text-gray-500 py-8 text-center">Cargando...</p>
  {:else if error}
    <p class="text-sm text-red-600 py-8 text-center">{error}</p>
  {:else if grupos.length === 0}
    <p class="text-sm text-gray-500 py-12 text-center border border-dashed rounded-xl bg-white">Sin profesores para "{carreraSigla}" {q ? `con búsqueda "${q}"` : ''}</p>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
      {#each grupos as g}
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-4 py-3 border-b bg-gray-50 flex justify-between items-start gap-2">
            <div class="min-w-0">
              <h2 class="font-semibold text-sm sm:text-[15px] leading-tight truncate">{g.nombre}</h2>
              <p class="text-xs text-gray-500">Adscripción: {g.adscripcion} · {g.materias.length} {g.materias.length===1 ? 'materia' : 'materias'}</p>
            </div>
            <span class="shrink-0 text-[11px] font-medium bg-blue-600 text-white px-2 py-1 rounded-full">{g.adscripcion}</span>
          </div>
          {#if g.materias.length === 0}
            <p class="px-4 py-6 text-xs text-gray-400 text-center">Sin materias asignadas</p>
          {:else}
            <ul class="divide-y divide-gray-100">
              {#each g.materias as m}
                <li class="px-4 py-2.5 flex justify-between gap-3 items-center">
                  <div class="min-w-0">
                    <p class="text-sm font-medium leading-tight truncate">{m.materia_nombre}</p>
                    <p class="text-xs text-gray-500 truncate">{m.materia_clave} · {m.carrera_nombre} <span class="font-mono">({m.materia_carrera})</span></p>
                  </div>
                  <span class="shrink-0 text-xs bg-gray-100 border px-2 py-1 rounded-full">{m.horas_semana} h/sem</span>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
