<script lang="ts">
  import { StatusBadge } from "@sdk/ui";
  import { formatMxn, type JobOrderStatus } from "@sdk/core";
  import { visionStore } from "../visionStore.svelte.ts";

  interface KanbanColumn {
    id: string;
    name: string;
    shortcut: string;
    colorClass: string;
    statusMatch: JobOrderStatus[];
  }

  const KANBAN_COLUMNS: KanbanColumn[] = [
    {
      id: "saludo",
      name: "01: Saludo",
      shortcut: "/hi",
      colorClass: "border-t-info",
      statusMatch: ["draft"],
    },
    {
      id: "triage",
      name: "02: Triage",
      shortcut: "/route",
      colorClass: "border-t-base-content/40",
      statusMatch: ["pending_triage"],
    },
    {
      id: "discovery",
      name: "03: Discovery",
      shortcut: "/urgencia",
      colorClass: "border-t-accent",
      statusMatch: ["dispatched"],
    },
    {
      id: "cotizacion",
      name: "04: Cotización",
      shortcut: "/confirmacion_ok",
      colorClass: "border-t-warning",
      statusMatch: ["accepted"],
    },
    {
      id: "ejecucion",
      name: "05: Ejecución",
      shortcut: "/en_camino",
      colorClass: "border-t-primary",
      statusMatch: [
        "in_transit",
        "en_camino",
        "in_progress",
        "pending_quote_approval",
        "winding_down",
      ],
    },
    {
      id: "validacion",
      name: "06: Validación",
      shortcut: "/validacion_ok",
      colorClass: "border-t-warning",
      statusMatch: ["pending_validation"],
    },
    {
      id: "pago",
      name: "07: Pago Escrow",
      shortcut: "/pago",
      colorClass: "border-t-secondary",
      statusMatch: ["validated"],
    },
    {
      id: "cierre",
      name: "08: Facturación",
      shortcut: "/factura_digital",
      colorClass: "border-t-success",
      statusMatch: ["completed"],
    },
  ];
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-xl font-black text-base-content tracking-tight">
        Tablero Kanban de Ciclo de Vida (8 Fases)
      </h2>
      <p class="text-xs text-base-content/60">
        Monitoreo del flujo cerrado: Pedido ➔ Match ➔ Ejecución ➔ Validación ➔
        Pago ➔ CFDI
      </p>
    </div>
    <span class="badge badge-accent badge-sm font-mono font-bold"
      >FLUID-DISPATCH</span
    >
  </div>

  <div class="flex gap-4 overflow-x-auto pb-4 pt-1 items-start min-h-[580px]">
    {#each KANBAN_COLUMNS as col}
      {@const columnOrders = visionStore.orders.filter((o) =>
        col.statusMatch.includes(o.status),
      )}
      <div
        class="w-72 shrink-0 bg-base-200/70 border border-base-300 rounded-2xl flex flex-col max-h-[580px] shadow-sm border-t-4 {col.colorClass}"
      >
        <div
          class="p-3 border-b border-base-300 flex items-center justify-between"
        >
          <div>
            <span class="font-mono text-[10px] font-bold text-base-content/60"
              >{col.shortcut}</span
            >
            <h4 class="font-extrabold text-xs text-base-content">{col.name}</h4>
          </div>
          <span class="badge badge-neutral badge-xs font-mono font-bold"
            >{columnOrders.length}</span
          >
        </div>

        <div class="p-2 space-y-2.5 overflow-y-auto flex-1">
          {#each columnOrders as order}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="card bg-base-100 border border-base-300 rounded-xl p-3.5 hover:border-primary cursor-pointer transition-all shadow-xs space-y-2 {visionStore.selectedTicketId ===
              order.id
                ? 'ring-2 ring-primary border-primary'
                : ''}"
              onclick={() => visionStore.selectTicket(order.id)}
            >
              <div class="flex items-start justify-between">
                <span class="font-mono text-[11px] font-bold text-primary"
                  >{order.code}</span
                >
                <StatusBadge status={order.status} size="xs" />
              </div>

              <div>
                <div class="font-bold text-xs text-base-content">
                  {order.customer?.fullName}
                </div>
                <div class="text-[10px] text-base-content/60 truncate">
                  {order.addressText}
                </div>
              </div>

              <div
                class="pt-2 border-t border-base-300/60 flex items-center justify-between text-[11px] font-mono"
              >
                <span class="text-base-content/70"
                  >{formatMxn(order.totalCustomerCents)}</span
                >
                <span class="text-accent font-semibold text-[10px]"
                  >{order.collaborator?.fullName
                    ? order.collaborator.fullName.split(" ")[0]
                    : "Colaborador"}</span
                >
              </div>
            </div>
          {:else}
            <div
              class="h-24 flex items-center justify-center text-xs text-base-content/30 italic"
            >
              Sin tickets en esta fase
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>
