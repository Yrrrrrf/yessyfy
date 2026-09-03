<script lang="ts">
import type { ColabTab } from '../types.ts';

interface Props {
  currentTab: ColabTab;
  isCollabOnDuty: boolean;
  onTabChange: (tab: ColabTab) => void;
  onToggleDuty: () => void;
}

let {
  currentTab = $bindable('radar'),
  isCollabOnDuty = $bindable(true),
  onTabChange,
  onToggleDuty,
}: Props = $props();
</script>

<header class="bg-base-100/95 backdrop-blur-md border-b border-base-300 sticky top-0 z-40 px-4 md:px-8 py-3">
  <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
    <!-- Brand & Pro Badge -->
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-2xl bg-accent text-accent-content font-black text-xl flex items-center justify-center shadow-md">
        ⚡
      </div>
      <div>
        <div class="flex items-center gap-1.5">
          <span class="font-black text-lg tracking-tight text-base-content">Yessyfy Pro</span>
          <span class="badge badge-accent badge-xs font-bold uppercase">Colaborador</span>
        </div>
        <span class="text-[10px] text-base-content/60 font-medium hidden sm:block">
          Plataforma de Ejecución en Campo & Retenciones SAT
        </span>
      </div>
    </div>

    <!-- Desktop Nav Links -->
    <nav class="hidden md:flex items-center gap-1 bg-base-200/60 p-1 rounded-2xl border border-base-300 text-xs font-bold">
      <button
        type="button"
        class="btn btn-xs rounded-xl font-bold {currentTab === 'radar' ? 'btn-accent text-accent-content shadow' : 'btn-ghost text-base-content/80'}"
        onclick={() => onTabChange('radar')}
      >
        📡 Radar de Chamba
      </button>
      <button
        type="button"
        class="btn btn-xs rounded-xl font-bold {currentTab === 'chamba_activa' ? 'btn-accent text-accent-content shadow' : 'btn-ghost text-base-content/80'}"
        onclick={() => onTabChange('chamba_activa')}
      >
        🔧 Chamba Activa
      </button>
      <button
        type="button"
        class="btn btn-xs rounded-xl font-bold {currentTab === 'billetera' ? 'btn-accent text-accent-content shadow' : 'btn-ghost text-base-content/80'}"
        onclick={() => onTabChange('billetera')}
      >
        💼 Billetera & SAT SPEI
      </button>
      <button
        type="button"
        class="btn btn-xs rounded-xl font-bold {currentTab === 'perfil' ? 'btn-accent text-accent-content shadow' : 'btn-ghost text-base-content/80'}"
        onclick={() => onTabChange('perfil')}
      >
        👤 Mi Perfil KYC
      </button>
    </nav>

    <!-- Duty Toggle & Quick Balance -->
    <div class="flex items-center gap-3">
      <!-- On-duty indicator & switch -->
      <div class="flex items-center gap-2 bg-base-200 px-3 py-1.5 rounded-2xl border border-base-300">
        <span class="w-2.5 h-2.5 rounded-full {isCollabOnDuty ? 'bg-success animate-ping' : 'bg-base-content/30'}"></span>
        <span class="text-xs font-bold text-base-content hidden sm:inline">
          {isCollabOnDuty ? 'En Guardia' : 'Fuera de Servicio'}
        </span>
        <input
          type="checkbox"
          bind:checked={isCollabOnDuty}
          onchange={onToggleDuty}
          class="toggle toggle-accent toggle-xs"
        />
      </div>

      <!-- Quick Profile Trigger -->
      <button
        type="button"
        class="btn btn-ghost btn-circle btn-sm bg-accent/15 text-accent-content font-bold text-xs"
        onclick={() => onTabChange('perfil')}
        title="Perfil Técnico"
      >
        RM
      </button>
    </div>
  </div>
</header>
