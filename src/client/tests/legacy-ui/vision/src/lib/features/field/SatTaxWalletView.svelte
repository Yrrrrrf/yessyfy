<script lang="ts">
  import { formatMxn } from "@sdk/core";

  interface PayoutEntry {
    id: string;
    orderCode: string;
    date: string;
    grossCents: number;
    platformFeeCents: number;
    isrWithheldCents: number;
    ivaWithheldCents: number;
    netPayoutCents: number;
    clabe: string;
    speiTracking: string;
  }

  const PAYOUT_HISTORY: PayoutEntry[] = [
    {
      id: "pay_01",
      orderCode: "YSF-2026-0879",
      date: "Ayer, 16:40",
      grossCents: 45000,
      platformFeeCents: 6750,
      isrWithheldCents: 450,
      ivaWithheldCents: 3600,
      netPayoutCents: 34200,
      clabe: "012180001234567890",
      speiTracking: "SPEI-20260228-0992381",
    },
    {
      id: "pay_02",
      orderCode: "YSF-2026-0872",
      date: "27 Feb 2026",
      grossCents: 60000,
      platformFeeCents: 9000,
      isrWithheldCents: 600,
      ivaWithheldCents: 4800,
      netPayoutCents: 45600,
      clabe: "012180001234567890",
      speiTracking: "SPEI-20260227-0112450",
    },
  ];

  let totalGrossCents = $derived(
    PAYOUT_HISTORY.reduce((acc, p) => acc + p.grossCents, 0) + 45000,
  );
  let totalNetCents = $derived(
    PAYOUT_HISTORY.reduce((acc, p) => acc + p.netPayoutCents, 0) + 34200,
  );
</script>

<div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
  <div>
    <h2 class="text-xl font-black text-base-content tracking-tight">
      Billetera & Retenciones SAT CFDI
    </h2>
    <p class="text-xs text-base-content/70 mt-0.5">
      Cumplimiento fiscal y dispersión automática SPEI bajo la LISR Art. 113-A y
      LIVA Art. 18-J para plataformas digitales.
    </p>
  </div>

  <!-- Wallet Summary Balance Card -->
  <div
    class="card bg-gradient-to-br from-accent/20 via-base-200 to-base-100 border-2 border-accent/40 rounded-3xl p-6 shadow-md space-y-4"
  >
    <div class="flex items-center justify-between">
      <span
        class="text-xs font-bold uppercase tracking-wider text-base-content/70"
        >Balance Disponible para SPEI</span
      >
      <span class="badge badge-success badge-xs font-bold"
        >Transferencia Inmediata</span
      >
    </div>
    <div class="space-y-0.5">
      <div class="text-3xl font-black font-mono text-base-content">
        {formatMxn(totalNetCents)}
      </div>
      <span class="text-[11px] text-base-content/60"
        >Total Bruto acumulado: {formatMxn(totalGrossCents)}</span
      >
    </div>

    <!-- SAT Tax Breakdown Tile -->
    <div
      class="p-4 rounded-2xl bg-base-100 border border-base-300 font-mono text-xs space-y-2.5"
    >
      <div class="flex justify-between text-base-content/70">
        <span>Comisión Yessyfy (15%):</span>
        <span>-{formatMxn(6750)}</span>
      </div>
      <div class="flex justify-between text-base-content/70">
        <span>Retención SAT ISR (1.0% con RFC):</span>
        <span>-{formatMxn(450)}</span>
      </div>
      <div class="flex justify-between text-base-content/70">
        <span>Retención SAT IVA (8.0% con RFC):</span>
        <span>-{formatMxn(3600)}</span>
      </div>
      <div
        class="flex justify-between pt-2 border-t border-base-300 font-bold text-success text-sm font-sans"
      >
        <span>Depósito Neto SPEI:</span>
        <span class="font-mono">{formatMxn(34200)}</span>
      </div>
    </div>

    <button
      type="button"
      class="btn btn-accent btn-block rounded-2xl font-black text-sm min-h-[52px] shadow-md text-accent-content"
      onclick={() =>
        alert("Transferencia SPEI enviada a tu cuenta BBVA terminación 7890")}
    >
      🏦 Retirar por SPEI a CLABE (*** 7890)
    </button>
  </div>

  <!-- Payout History -->
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h3
        class="font-extrabold text-sm text-base-content uppercase tracking-wider"
      >
        Historial de Pagos y Liquidaciones
      </h3>
      <span class="text-xs text-base-content/60">Últimos movimientos</span>
    </div>

    <div class="space-y-2">
      {#each PAYOUT_HISTORY as payout}
        <div
          class="card bg-base-100 border border-base-300 rounded-2xl p-4 space-y-2 text-xs shadow-sm"
        >
          <div class="flex items-center justify-between">
            <span class="font-bold text-base-content"
              >Servicio #{payout.orderCode}</span
            >
            <span class="font-mono font-black text-success text-sm"
              >+{formatMxn(payout.netPayoutCents)}</span
            >
          </div>
          <div
            class="flex items-center justify-between text-base-content/60 font-mono text-[11px]"
          >
            <span>{payout.date}</span>
            <span>{payout.speiTracking}</span>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
