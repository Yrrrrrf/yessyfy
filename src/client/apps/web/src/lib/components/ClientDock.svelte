<script lang="ts">
export type ClientTab = 'inicio' | 'buscar' | 'reservas' | 'perfil';

interface Props {
  currentTab: ClientTab;
  activeOrderCount?: number;
  onTabChange: (tab: ClientTab) => void;
}

let {
  currentTab = $bindable('inicio'),
  activeOrderCount = 1,
  onTabChange,
}: Props = $props();
</script>

<!-- Mobile Navigation Dock (Hidden on desktop md:) -->
<nav class="md:hidden dock dock-sm fixed bottom-0 left-0 right-0 z-40 bg-base-100/95 backdrop-blur-md border-t border-base-300 w-full shadow-lg">
  <button
    type="button"
    class={currentTab === 'inicio' ? 'dock-active' : ''}
    onclick={() => onTabChange('inicio')}
  >
    <span class="text-lg">🏠</span>
    <span class="dock-label text-[10px] font-bold">Inicio</span>
  </button>
  <button
    type="button"
    class={currentTab === 'buscar' ? 'dock-active' : ''}
    onclick={() => onTabChange('buscar')}
  >
    <span class="text-lg">🔍</span>
    <span class="dock-label text-[10px] font-bold">Buscar</span>
  </button>
  <button
    type="button"
    class="relative {currentTab === 'reservas' ? 'dock-active' : ''}"
    onclick={() => onTabChange('reservas')}
  >
    {#if activeOrderCount > 0}
      <span class="badge badge-primary badge-xs absolute top-1 right-3 font-mono font-bold">
        {activeOrderCount}
      </span>
    {/if}
    <span class="text-lg">⏱️</span>
    <span class="dock-label text-[10px] font-bold">Cockpit</span>
  </button>
  <button
    type="button"
    class={currentTab === 'perfil' ? 'dock-active' : ''}
    onclick={() => onTabChange('perfil')}
  >
    <span class="text-lg">👤</span>
    <span class="dock-label text-[10px] font-bold">Perfil</span>
  </button>
</nav>
