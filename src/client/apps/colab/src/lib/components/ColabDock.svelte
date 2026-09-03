<script lang="ts">
import type { ColabTab } from '../types.ts';

interface Props {
  currentTab: ColabTab;
  activeJobCount?: number;
  onTabChange: (tab: ColabTab) => void;
}

let {
  currentTab = $bindable('radar'),
  activeJobCount = 1,
  onTabChange,
}: Props = $props();
</script>

<nav class="md:hidden dock dock-sm fixed bottom-0 left-0 right-0 z-40 bg-base-100/95 backdrop-blur-md border-t border-base-300 w-full shadow-lg">
  <button
    type="button"
    class={currentTab === 'radar' ? 'dock-active' : ''}
    onclick={() => onTabChange('radar')}
  >
    <span class="text-lg">📡</span>
    <span class="dock-label text-[10px] font-bold">Radar</span>
  </button>
  <button
    type="button"
    class="relative {currentTab === 'chamba_activa' ? 'dock-active' : ''}"
    onclick={() => onTabChange('chamba_activa')}
  >
    {#if activeJobCount > 0}
      <span class="badge badge-accent badge-xs absolute top-1 right-3 font-mono font-bold">
        {activeJobCount}
      </span>
    {/if}
    <span class="text-lg">🔧</span>
    <span class="dock-label text-[10px] font-bold">Chamba</span>
  </button>
  <button
    type="button"
    class={currentTab === 'billetera' ? 'dock-active' : ''}
    onclick={() => onTabChange('billetera')}
  >
    <span class="text-lg">💼</span>
    <span class="dock-label text-[10px] font-bold">SAT Wallet</span>
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
