<script lang="ts">
  import { Logo } from "@sdk/ui";
  import type { ClientTab } from "./ClientDock.svelte";

  interface Props {
    currentTab: ClientTab;
    isMember: boolean;
    authenticatedUser: { id: string; phone: string; role: string } | null;
    onTabChange: (tab: ClientTab) => void;
    onOpenAuth: () => void;
    onOpenProfile?: () => void;
  }

  let {
    currentTab = $bindable("inicio"),
    isMember,
    authenticatedUser,
    onTabChange,
    onOpenAuth,
    onOpenProfile,
  }: Props = $props();

  let selectedColonia = $state("Polanco");
</script>

<header
  class="bg-base-100/95 backdrop-blur-md border-b border-base-300 sticky top-0 z-40 px-4 md:px-8 py-3"
>
  <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
    <!-- Brand Logo -->
    <div class="flex items-center gap-3 shrink-0">
      <button
        type="button"
        class="flex items-center gap-2.5 text-left group transition-transform group-hover:scale-105"
        onclick={() => onTabChange("inicio")}
      >
        <Logo
          subtitle="Garantía Escrow 30 Días"
          badgeText="CDMX"
          badgeClass="badge-primary"
        />
      </button>
    </div>

    <!-- Desktop Nav Links -->
    <nav
      class="hidden md:flex items-center gap-1 bg-base-200/60 p-1 rounded-2xl border border-base-300 text-xs font-bold"
    >
      <button
        type="button"
        class="btn btn-xs rounded-xl font-bold {currentTab === 'inicio'
          ? 'btn-primary text-white shadow'
          : 'btn-ghost text-base-content/80'}"
        onclick={() => onTabChange("inicio")}
      >
        🏠 Inicio / Cotizador
      </button>
      <button
        type="button"
        class="btn btn-xs rounded-xl font-bold {currentTab === 'buscar'
          ? 'btn-primary text-white shadow'
          : 'btn-ghost text-base-content/80'}"
        onclick={() => onTabChange("buscar")}
      >
        🔍 Directorio de Profesionales
      </button>
      <button
        type="button"
        class="btn btn-xs rounded-xl font-bold {currentTab === 'reservas'
          ? 'btn-primary text-white shadow'
          : 'btn-ghost text-base-content/80'}"
        onclick={() => onTabChange("reservas")}
      >
        ⏱️ Cockpit de Servicio
      </button>
      <button
        type="button"
        class="btn btn-xs rounded-xl font-bold {currentTab === 'perfil'
          ? 'btn-primary text-white shadow'
          : 'btn-ghost text-base-content/80'}"
        onclick={() => onTabChange("perfil")}
      >
        👤 Mi Cuenta
      </button>
    </nav>

    <!-- Right Controls: Colonia + Auth -->
    <div class="flex items-center gap-2 sm:gap-3">
      <div class="hidden sm:block">
        <select
          bind:value={selectedColonia}
          class="select select-xs text-xs font-bold bg-base-200 border-base-300 rounded-xl"
        >
          <option value="Polanco">📍 Polanco</option>
          <option value="Condesa">📍 Condesa</option>
          <option value="Roma Norte">📍 Roma Norte</option>
          <option value="Coyoacán">📍 Coyoacán</option>
          <option value="Del Valle">📍 Del Valle</option>
          <option value="Santa Fe">📍 Santa Fe</option>
        </select>
      </div>

      {#if authenticatedUser}
        <button
          type="button"
          class="btn btn-ghost btn-circle btn-sm bg-primary/10 text-primary font-bold text-xs"
          onclick={onOpenProfile}
          title="Ver perfil"
        >
          {authenticatedUser.phone.slice(-2)}
        </button>
      {:else}
        <button
          type="button"
          class="btn btn-primary btn-sm font-bold rounded-2xl px-4"
          onclick={onOpenAuth}
        >
          Ingresar
        </button>
      {/if}
    </div>
  </div>
</header>
