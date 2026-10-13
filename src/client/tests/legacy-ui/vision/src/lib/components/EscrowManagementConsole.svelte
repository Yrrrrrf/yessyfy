<script lang="ts">
  import { EscrowStatusCard, StatusBadge } from "@sdk/ui";
  import { formatMxn } from "@sdk/core";
  import { visionStore } from "../visionStore.svelte.ts";

  let selectedBatchOrders = $state<string[]>(["ord_101", "ord_102"]);
  let batchStampingSuccess = $state(false);

  function handleBatchStamp() {
    batchStampingSuccess = true;
    setTimeout(() => (batchStampingSuccess = false), 4000);
  }
</script>

<div class="space-y-6">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h2 class="text-xl font-black text-base-content tracking-tight">
        Libro Mayor de Escrow & Timbrado Masivo SAT CFDI 4.0
      </h2>
      <p class="text-xs text-base-content/70">
        Retenciones fiscales (LISR 113-A e LIVA 18-J) y emisión masiva de
        comprobantes fiscales digitales.
      </p>
    </div>

    <button
      type="button"
      class="btn btn-primary btn-sm rounded-xl font-bold min-h-[44px] shadow"
      onclick={handleBatchStamp}
    >
      💼 Timbrar Lote Seleccionado ({selectedBatchOrders.length})
    </button>
  </div>

  {#if batchStampingSuccess}
    <div class="alert alert-success text-xs font-bold p-3 rounded-2xl">
      ✓ Lote timbrado exitosamente ante el PAC SAT. Se han emitido los archivos
      XML y PDF oficiales.
    </div>
  {/if}

  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <EscrowStatusCard amountCents={21850000} status="retained" />
    <EscrowStatusCard amountCents={7438600} status="released" />
    <EscrowStatusCard amountCents={4000000} status="disputed" />
  </div>

  <div
    class="card bg-base-200 border border-base-300 rounded-3xl p-6 overflow-x-auto"
  >
    <table class="table table-sm">
      <thead>
        <tr class="text-base-content/60 text-xs">
          <th>Sel</th>
          <th>Folio</th>
          <th>Cliente</th>
          <th>Total Cliente</th>
          <th>Comisión (15%)</th>
          <th>Retención SAT</th>
          <th>Neto Colaborador</th>
          <th>Estado Escrow</th>
        </tr>
      </thead>
      <tbody>
        {#each visionStore.orders as order}
          <tr class="font-mono text-xs hover:bg-base-300/40">
            <td>
              <input
                type="checkbox"
                checked={selectedBatchOrders.includes(order.id)}
                class="checkbox checkbox-primary checkbox-xs"
                onchange={(e) => {
                  const checked = (e.target as HTMLInputElement).checked;
                  if (checked) {
                    selectedBatchOrders = [...selectedBatchOrders, order.id];
                  } else {
                    selectedBatchOrders = selectedBatchOrders.filter(
                      (id) => id !== order.id,
                    );
                  }
                }}
              />
            </td>
            <td class="font-bold text-primary">{order.code}</td>
            <td class="font-sans font-medium">{order.customer?.fullName}</td>
            <td>{formatMxn(order.totalCustomerCents)}</td>
            <td>{formatMxn(order.platformFeeCents)}</td>
            <td class="text-error"
              >-{formatMxn(order.isrWithheldCents + order.ivaWithheldCents)}</td
            >
            <td class="text-success font-bold"
              >{formatMxn(order.collaboratorNetCents)}</td
            >
            <td><StatusBadge status={order.status} size="xs" /></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
