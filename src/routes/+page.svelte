<script lang="ts">
  import { onMount } from 'svelte';
  
  let carreras = $state([]);
  let error = $state(null);
  
  onMount(async () => {
    try {
      const res = await fetch('/api/carreras');
      const data = await res.json();
      carreras = data.data || [];
    } catch (e) {
      error = 'Error al cargar';
      console.error(e);
    }
  });
</script>

<div class="max-w-7xl mx-auto p-4">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold">Funcionalidades Informática UNSIS</h1>
    <a href="/admin" class="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">Actualizar Excel</a>
  </div>
  
  {#if error}
    <p class="text-red-600">Error: {error}</p>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each carreras as carrera}
      <a href={`/asignacion?carrera=${carrera.sigla}`} 
         class="group block rounded-lg overflow-hidden border border-gray-300 hover:border-primary-600 transition-colors">
        <div class="p-6">
          <h3 class="text-xl font-medium mb-2">{carrera.nombre}</h3>
          <p class="text-sm text-gray-500">{carrera.sigla}</p>
        </div>
        <svg class="w-5 h-5 ml-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12hM19 12"/>
        </svg>
      </a>
      {/each}
    </div>
  {/if}
  
  <div class="mt-8">
    <p class="text-sm text-gray-500">Total de carreras: {carreras.length}</p>
  </div>
</div>