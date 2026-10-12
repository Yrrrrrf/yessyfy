<script lang="ts">
import type { JobOrderStatus, UrgencyLevel } from '@sdk/core';

interface BadgeConfig {
  label: string;
  badgeClass: string;
  pulse: boolean;
}

const ESCROW_CONFIGS: Record<string, BadgeConfig> = {
  retained: { label: 'En Custodia Escrow', badgeClass: 'badge-warning', pulse: true },
  released: { label: 'Pago Liberado', badgeClass: 'badge-success', pulse: false },
  disputed: { label: 'Fondos Congelados (Disputa)', badgeClass: 'badge-error', pulse: true },
};

const URGENCY_CONFIGS: Record<string, BadgeConfig> = {
  normal: { label: 'Normal (1.0x)', badgeClass: 'badge-ghost', pulse: false },
  mismo_dia: { label: 'Mismo Día (1.3x)', badgeClass: 'badge-info', pulse: false },
  emergencia_24_7: { label: 'Emergencia 24/7 (1.8x)', badgeClass: 'badge-error', pulse: true },
};

const STATUS_CONFIGS: Record<string, BadgeConfig> = {
  draft: { label: 'Borrador', badgeClass: 'badge-ghost', pulse: false },
  pending_triage: { label: 'Triage Pendiente', badgeClass: 'badge-warning', pulse: true },
  dispatched: { label: 'Buscando Profesional', badgeClass: 'badge-info', pulse: true },
  accepted: { label: 'Profesional Asignado', badgeClass: 'badge-info', pulse: false },
  in_transit: { label: 'En Camino', badgeClass: 'badge-accent', pulse: true },
  en_camino: { label: 'En Camino', badgeClass: 'badge-accent', pulse: true },
  in_progress: { label: 'Trabajo en Proceso', badgeClass: 'badge-primary', pulse: true },
  pending_quote_approval: { label: 'Cotización en Revisión', badgeClass: 'badge-warning', pulse: true },
  winding_down: { label: 'Pruebas Finales / Limpieza', badgeClass: 'badge-info', pulse: true },
  pending_validation: { label: 'QA Pendiente de Firma', badgeClass: 'badge-warning', pulse: true },
  validated: { label: 'Servicio Validado', badgeClass: 'badge-success', pulse: false },
  completed: { label: 'Concluido & Garantizado', badgeClass: 'badge-success', pulse: false },
  disputed: { label: 'En Revisión de Garantía', badgeClass: 'badge-error', pulse: true },
  cancelled: { label: 'Cancelado', badgeClass: 'badge-ghost', pulse: false },
};

const DEFAULT_CONFIG: BadgeConfig = { label: 'Estado', badgeClass: 'badge-ghost', pulse: false };

interface Props {
  status?: JobOrderStatus;
  escrowStatus?: 'retained' | 'released' | 'disputed';
  urgency?: UrgencyLevel;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

let { status, escrowStatus, urgency, size = 'md' }: Props = $props();

const config = $derived(
  (escrowStatus && ESCROW_CONFIGS[escrowStatus]) ||
  (urgency && URGENCY_CONFIGS[urgency]) ||
  (status && STATUS_CONFIGS[status]) ||
  DEFAULT_CONFIG
);

const sizeClass = $derived(
  size === 'xs' ? 'badge-xs' : size === 'sm' ? 'badge-sm' : size === 'lg' ? 'badge-lg' : 'badge-md'
);
</script>

<span class="badge {config.badgeClass} inline-flex items-center gap-1.5 font-medium {sizeClass}">
  {#if config.pulse}
    <span class="relative flex h-2 w-2">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current"></span>
      <span class="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
    </span>
  {/if}
  {config.label}
</span>



