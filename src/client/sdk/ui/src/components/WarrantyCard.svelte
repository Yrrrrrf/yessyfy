<script lang="ts">
import type { WarrantyCertificate } from '@sdk/core';
import TrustBadge from './TrustBadge.svelte';
import WarrantyCertificatePdfModal from './fiscal/WarrantyCertificatePdfModal.svelte';

interface Props {
  certificate: WarrantyCertificate;
}

let { certificate }: Props = $props();

let isWarrantyModalOpen = $state(false);

const formatDate = (iso: string) => {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};
</script>

<div class="card bg-gradient-to-br from-base-100 via-base-100 to-primary/5 border-2 border-primary/40 rounded-3xl p-6 shadow-xl space-y-5 relative overflow-hidden">
  <!-- Watermark Stamp -->
  <div class="absolute -right-6 -bottom-6 opacity-5 pointer-events-none text-9xl font-black select-none">
    YSF
  </div>

  <div class="flex items-start justify-between">
    <div>
      <span class="badge badge-primary badge-sm font-bold uppercase tracking-wider mb-1.5">
        Certificado Oficial
      </span>
      <h3 class="text-lg font-black tracking-tight text-base-content">
        Garantía Legal de 30 Días
      </h3>
      <p class="font-mono text-xs text-base-content/60 mt-0.5">
        Folio: {certificate.certificateNumber}
      </p>
    </div>

    <!-- Decorative QR Code -->
    <div class="p-1.5 bg-white rounded-xl border border-base-300 shadow-sm">
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-neutral" role="img" aria-label="Código QR de validación de garantía">
        <title>Código QR de validación de garantía</title>
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
        <path d="M7 7h.01M17 7h.01M7 17h.01M17 17h.01"></path>
      </svg>
    </div>
  </div>

  <div class="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-base-200/80 border border-base-300/60 text-xs">
    <div>
      <span class="text-base-content/60 block text-[10px] uppercase font-bold">Válida Desde</span>
      <span class="font-semibold text-base-content">{formatDate(certificate.validFrom)}</span>
    </div>
    <div>
      <span class="text-base-content/60 block text-[10px] uppercase font-bold">Válida Hasta</span>
      <span class="font-bold text-success">{formatDate(certificate.validUntil)}</span>
    </div>
  </div>

  <div class="text-xs text-base-content/70 leading-relaxed space-y-1">
    <p>
      Este servicio cuenta con respaldo formal de Yessyfy. Si la reparación presenta fugas, fallas eléctricas o defectos de mano de obra durante los 30 días posteriores, un técnico regresará sin costo adicional para ti.
    </p>
  </div>

  <!-- Action Button to View/Download Legal Warranty PDF -->
  <button
    type="button"
    class="btn btn-outline btn-primary btn-sm rounded-2xl w-full font-bold min-h-[44px] gap-2 shadow-sm"
    onclick={() => (isWarrantyModalOpen = true)}
  >
    📜 Ver Póliza Oficial & Cobertura Legal ($500,000 MXN) →
  </button>

  <div class="flex items-center justify-between pt-3 border-t border-base-300">
    <TrustBadge kind="warranty_30d" variant="compact" />
    <span class="font-mono text-[10px] text-base-content/40 truncate max-w-[150px]">
      Hash: {certificate.termsHash.slice(0, 16)}...
    </span>
  </div>
</div>

<WarrantyCertificatePdfModal
  open={isWarrantyModalOpen}
  certificate={certificate}
  onClose={() => (isWarrantyModalOpen = false)}
/>



