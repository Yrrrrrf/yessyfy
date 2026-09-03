<script lang="ts">
import {
  BeforeAfterSlider,
  EscrowStatusCard,
  PriceBreakdown,
  StatusBadge,
  SvgGpsTracker,
  TechProfileCard,
  VehiclePlateCard,
  WarrantyCard,
} from '@sdk/ui';
import { formatMxn, type JobOrderStatus, type WarrantyCertificate } from '@sdk/core';
import type { serviceOrderMachine } from '@sdk/state';
import type { SnapshotFrom } from 'xstate';

interface Props {
  fsmState: SnapshotFrom<typeof serviceOrderMachine>;
  beforePhotoUrl: string;
  afterPhotoUrl: string;
  activeWarranty: WarrantyCertificate;
  onOpenGatePass: () => void;
  onOpenChat: () => void;
  onOpenSupplemental: () => void;
  onOpenReview: () => void;
  onOpenInvoice: () => void;
}

let {
  fsmState,
  beforePhotoUrl,
  afterPhotoUrl,
  activeWarranty,
  onOpenGatePass,
  onOpenChat,
  onOpenSupplemental,
  onOpenReview,
  onOpenInvoice,
}: Props = $props();

const status = $derived<JobOrderStatus>(
  (fsmState.value as JobOrderStatus) || 'en_camino'
);

const isCompleted = $derived(status === 'completed' || status === 'validated');
const isDisputed = $derived(status === 'disputed');
</script>

<div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
  <!-- Status & Order Header -->
  <div class="flex items-center justify-between">
    <div>
      <span class="text-[10px] font-mono font-bold uppercase text-base-content/60 block">Orden Activa</span>
      <h2 class="text-xl font-black text-base-content">#{fsmState.context.code || 'YSF-2026-0881'}</h2>
    </div>
    <StatusBadge status={status} />
  </div>

  <!-- 6-Node FSM Progression Visualizer -->
  <div class="card bg-base-200/80 border border-base-300 rounded-3xl p-4 shadow-sm">
    <div class="flex items-center justify-between text-[11px] font-bold text-center">
      <div class="flex flex-col items-center gap-1">
        <span class="w-6 h-6 rounded-full bg-success text-white flex items-center justify-center text-xs">✓</span>
        <span class="text-base-content/80">Pedido</span>
      </div>
      <div class="h-0.5 flex-1 bg-success mx-1"></div>
      <div class="flex flex-col items-center gap-1">
        <span class="w-6 h-6 rounded-full bg-success text-white flex items-center justify-center text-xs">✓</span>
        <span class="text-base-content/80">Match</span>
      </div>
      <div class="h-0.5 flex-1 bg-success mx-1"></div>
      <div class="flex flex-col items-center gap-1">
        <span class="w-6 h-6 rounded-full {status === 'in_transit' || status === 'en_camino' ? 'bg-primary text-primary-content animate-pulse' : 'bg-success text-white'} flex items-center justify-center text-xs">3</span>
        <span class="text-primary">En Ruta</span>
      </div>
      <div class="h-0.5 flex-1 {status === 'in_progress' || isCompleted ? 'bg-success' : 'bg-base-300'} mx-1"></div>
      <div class="flex flex-col items-center gap-1">
        <span class="w-6 h-6 rounded-full {status === 'in_progress' ? 'bg-primary text-primary-content animate-pulse' : isCompleted ? 'bg-success text-white' : 'bg-base-300 text-base-content/60'} flex items-center justify-center text-xs">4</span>
        <span class="text-base-content/60">Sitio</span>
      </div>
      <div class="h-0.5 flex-1 {status === 'pending_validation' || isCompleted ? 'bg-success' : 'bg-base-300'} mx-1"></div>
      <div class="flex flex-col items-center gap-1">
        <span class="w-6 h-6 rounded-full {status === 'pending_validation' ? 'bg-warning text-warning-content' : isCompleted ? 'bg-success text-white' : 'bg-base-300 text-base-content/60'} flex items-center justify-center text-xs">5</span>
        <span class="text-base-content/60">QA</span>
      </div>
      <div class="h-0.5 flex-1 {status === 'completed' ? 'bg-success' : 'bg-base-300'} mx-1"></div>
      <div class="flex flex-col items-center gap-1">
        <span class="w-6 h-6 rounded-full {status === 'completed' ? 'bg-success text-white' : 'bg-base-300 text-base-content/60'} flex items-center justify-center text-xs">6</span>
        <span class="text-base-content/60">Garantía</span>
      </div>
    </div>
  </div>

  <!-- Live Vector Map Tracker -->
  {#if status === 'in_transit' || status === 'en_camino' || status === 'accepted'}
    <SvgGpsTracker
      etaMinutes={14}
      collaboratorName="Roberto Morales"
      vehicleMode="moto"
      progressPercent={65}
    />
  {/if}

  <!-- Security Pass & WhatsApp Share Card -->
  <div class="card bg-base-100 border border-base-300 rounded-3xl p-4 shadow-sm space-y-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xl">🛡️</span>
        <h4 class="font-extrabold text-sm text-base-content">Acceso de Seguridad para Caseta</h4>
      </div>
      <button type="button" class="btn btn-primary btn-xs font-bold rounded-xl" onclick={onOpenGatePass}>
        Ver Pase Digital →
      </button>
    </div>
    <VehiclePlateCard plateNumber="M-892-CDMX" vehicleType="moto" modelDescription="Italika FT150 Roja" />
  </div>

  <!-- In-App Chat Shortcut -->
  <div class="card bg-base-200 border border-base-300 rounded-3xl p-4 flex flex-row items-center justify-between shadow-sm">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-2xl bg-primary text-white font-bold flex items-center justify-center text-sm shadow">
        R
      </div>
      <div>
        <h4 class="font-bold text-sm text-base-content">Chat con Roberto Morales</h4>
        <p class="text-[11px] text-base-content/60">Técnico Verificado • En línea</p>
      </div>
    </div>
    <button type="button" class="btn btn-primary btn-sm rounded-xl font-bold" onclick={onOpenChat}>
      💬 Abrir Chat
    </button>
  </div>

  <!-- Escrow Retention Card -->
  <EscrowStatusCard
    amountCents={fsmState.context.totalCustomerCents || 45000}
    status={isDisputed ? 'disputed' : isCompleted ? 'released' : 'retained'}
  />

  <!-- Hidden Damage / Supplemental Alert Button -->
  {#if fsmState.context.supplementalCents > 0 || status === 'pending_quote_approval'}
    <div class="alert alert-warning alert-soft p-4 rounded-3xl flex items-center justify-between">
      <div class="text-xs">
        <span class="font-bold block">⚠️ Sobrecosto en Sitio Detectado</span>
        <span>Monto adicional: {formatMxn(fsmState.context.supplementalCents || 35000)}</span>
      </div>
      <button type="button" class="btn btn-warning btn-sm font-bold rounded-xl" onclick={onOpenSupplemental}>
        Revisar Sobrecosto
      </button>
    </div>
  {/if}

  <!-- Photographic QA Evidence (Before / After Comparison) -->
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <h3 class="font-extrabold text-sm text-base-content uppercase tracking-wider">Evidencia Fotográfica QA</h3>
      <span class="badge badge-success badge-xs font-mono font-bold">✓ SHA-256 Validado</span>
    </div>
    <BeforeAfterSlider
      beforeUrl={beforePhotoUrl}
      afterUrl={afterPhotoUrl}
      beforeLabel="Diagnóstico Inicial"
      afterLabel="Trabajo Concluido"
    />
  </div>

  <!-- Warranty Card (When Completed) -->
  {#if isCompleted}
    <WarrantyCard certificate={activeWarranty} />
  {/if}

  <!-- Action Controls -->
  <div class="space-y-2 pt-2">
    {#if !isCompleted}
      <button
        type="button"
        class="btn btn-primary btn-block rounded-2xl font-black text-sm min-h-[56px] shadow-lg shadow-primary/20"
        onclick={onOpenReview}
      >
        ✓ Firmar Conformidad & Liberar Pago Escrow
      </button>
    {:else}
      <button
        type="button"
        class="btn btn-neutral btn-block rounded-2xl font-bold min-h-[52px] text-sm"
        onclick={onOpenInvoice}
      >
        📄 Solicitar Factura SAT CFDI 4.0
      </button>
    {/if}
  </div>
</div>
