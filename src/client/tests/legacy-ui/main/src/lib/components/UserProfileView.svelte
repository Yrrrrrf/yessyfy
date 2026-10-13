<script lang="ts">
  import { formatMxn } from "@sdk/core";

  interface Props {
    authenticatedUser: { id: string; phone: string; role: string } | null;
    isMember: boolean;
    onToggleMembership: () => void;
    onOpenInvoiceDrawer: () => void;
    onLogout: () => void;
  }

  let {
    authenticatedUser,
    isMember = $bindable(),
    onToggleMembership,
    onOpenInvoiceDrawer,
    onLogout,
  }: Props = $props();

  let rfc = $state("GARM880415XYZ");
  let razonSocial = $state("MARIANA GARZA LOZANO");
  let postalCode = $state("11550");
</script>

<div class="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
  <!-- Profile Avatar Card -->
  <div
    class="card bg-base-100 border border-base-300 rounded-3xl p-5 flex flex-row items-center gap-4 shadow-sm"
  >
    <div
      class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-accent text-white font-black text-2xl flex items-center justify-center shadow"
    >
      {authenticatedUser?.phone.slice(-2) || "U"}
    </div>
    <div class="flex-1 min-w-0">
      <h3 class="font-extrabold text-base text-base-content truncate">
        Mariana Garza Lozano
      </h3>
      <p class="text-xs text-base-content/60 font-mono">
        {authenticatedUser?.phone || "+52 55 4198 2300"}
      </p>
      <div class="flex items-center gap-1.5 mt-1">
        <span class="badge badge-success badge-xs font-bold"
          >Cliente Verificado</span
        >
        {#if isMember}
          <span class="badge badge-primary badge-xs font-bold"
            >Club Yessyfy+</span
          >
        {/if}
      </div>
    </div>
  </div>

  <!-- Club Yessyfy Membership Card -->
  <div
    class="card bg-gradient-to-br from-primary/20 via-base-200 to-base-100 border-2 border-primary/40 rounded-3xl p-5 space-y-3 shadow-md"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-2xl">👑</span>
        <div>
          <h4 class="font-black text-sm text-base-content">
            Membresía Club Yessyfy+
          </h4>
          <span class="text-[11px] text-base-content/70"
            >15% de descuento en todos los servicios</span
          >
        </div>
      </div>
      <input
        type="checkbox"
        bind:checked={isMember}
        onchange={onToggleMembership}
        class="toggle toggle-primary"
      />
    </div>
    <p class="text-xs text-base-content/75 leading-relaxed">
      Disfruta de presupuestos con descuento preferente, atención prioritaria de
      emergencia 24/7 y garantía extendida a 60 días.
    </p>
  </div>

  <!-- SAT Fiscal Configuration -->
  <div
    class="card bg-base-100 border border-base-300 rounded-3xl p-5 space-y-4 shadow-sm"
  >
    <div class="flex items-center justify-between">
      <h4
        class="font-extrabold text-sm text-base-content uppercase tracking-wider"
      >
        Datos Fiscales (SAT CFDI 4.0)
      </h4>
      <button
        type="button"
        class="btn btn-ghost btn-xs text-primary font-bold"
        onclick={onOpenInvoiceDrawer}
      >
        Ver Factura →
      </button>
    </div>

    <fieldset class="fieldset space-y-2 text-xs">
      <div class="flex justify-between py-1 border-b border-base-300">
        <span class="text-base-content/60 font-medium">RFC:</span>
        <span class="font-mono font-bold text-base-content">{rfc}</span>
      </div>
      <div class="flex justify-between py-1 border-b border-base-300">
        <span class="text-base-content/60 font-medium">Razón Social:</span>
        <span class="font-semibold text-base-content">{razonSocial}</span>
      </div>
      <div class="flex justify-between py-1">
        <span class="text-base-content/60 font-medium">C.P. Fiscal:</span>
        <span class="font-mono font-bold text-base-content">{postalCode}</span>
      </div>
    </fieldset>
  </div>

  <!-- Logout / Switch Account -->
  <button
    type="button"
    class="btn btn-outline btn-error btn-block rounded-2xl font-bold min-h-[50px] text-xs"
    onclick={onLogout}
  >
    Cerrar Sesión
  </button>
</div>
