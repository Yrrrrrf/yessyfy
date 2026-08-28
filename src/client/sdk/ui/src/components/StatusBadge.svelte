<script lang="ts">
import type { JobOrderStatus, UrgencyLevel } from '@sdk';

interface Props {
  status?: JobOrderStatus;
  escrowStatus?: 'retained' | 'released' | 'disputed';
  urgency?: UrgencyLevel;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

let { status, escrowStatus, urgency, size = 'md' }: Props = $props();

const config = $derived(() => {
  if (escrowStatus) {
    switch (escrowStatus) {
      case 'retained':
        return {
          label: 'En Custodia Escrow',
          badgeClass: 'badge-warning',
          pulse: true,
        };
      case 'released':
        return {
          label: 'Pago Liberado',
          badgeClass: 'badge-success',
          pulse: false,
        };
      case 'disputed':
        return {
          label: 'Fondos Congelados (Disputa)',
          badgeClass: 'badge-error',
          pulse: true,
        };
    }
  }

  if (urgency) {
    switch (urgency) {
      case 'normal':
        return { label: 'Normal (1.0x)', badgeClass: 'badge-ghost', pulse: false };
      case 'mismo_dia':
        return { label: 'Mismo Día (1.3x)', badgeClass: 'badge-info', pulse: false };
      case 'emergencia_24_7':
        return { label: 'Emergencia 24/7 (1.8x)', badgeClass: 'badge-error', pulse: true };
    }
  }

  if (status) {
    switch (status) {
      case 'draft':
        return { label: 'Borrador', badgeClass: 'badge-ghost', pulse: false };
      case 'pending_triage':
        return { label: 'Triage Pendiente', badgeClass: 'badge-warning', pulse: true };
      case 'dispatched':
        return { label: 'Buscando Técnico', badgeClass: 'badge-info', pulse: true };
      case 'accepted':
        return { label: 'Técnico Asignado', badgeClass: 'badge-info', pulse: false };
      case 'en_camino':
        return { label: 'Técnico En Camino', badgeClass: 'badge-accent', pulse: true };
      case 'in_progress':
        return { label: 'Trabajo En Progreso', badgeClass: 'badge-primary', pulse: true };
      case 'winding_down':
        return { label: 'Por Terminar (Pruebas)', badgeClass: 'badge-info', pulse: true };
      case 'pending_validation':
        return { label: 'QA Pendiente de Firma', badgeClass: 'badge-warning', pulse: true };
      case 'validated':
        return { label: 'Servicio Validado', badgeClass: 'badge-success', pulse: false };
      case 'completed':
        return { label: 'Concluido & Facturado', badgeClass: 'badge-success', pulse: false };
      case 'disputed':
        return { label: 'En Reclamación', badgeClass: 'badge-error', pulse: true };
      case 'cancelled':
        return { label: 'Cancelado', badgeClass: 'badge-ghost', pulse: false };
    }
  }

  return { label: 'Estado', badgeClass: 'badge-ghost', pulse: false };
});
</script>

<span
  class="badge {config().badgeClass} inline-flex items-center gap-1.5 font-medium {size === 'xs' ? 'badge-xs' : size === 'sm' ? 'badge-sm' : size === 'lg' ? 'badge-lg' : 'badge-md'}"
>
  {#if config().pulse}
    <span class="relative flex h-2 w-2">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current"></span>
      <span class="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
    </span>
  {/if}
  {config().label}
</span>
