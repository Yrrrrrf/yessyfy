<script lang="ts">
import InvoiceDownloadActions from './InvoiceDownloadActions.svelte';

interface Props {
  jobCode: string;
  stampedUuid: string;
  rfc: string;
  totalCents: number;
  customerName?: string;
}

let { jobCode, stampedUuid, rfc, totalCents, customerName = 'Mariana Garza Lozano' }: Props = $props();
</script>

<div class="space-y-4 text-center py-4">
  <div class="w-16 h-16 rounded-full bg-success/20 text-success text-3xl font-black flex items-center justify-center mx-auto">
    ✓
  </div>
  <div class="space-y-1">
    <h4 class="font-black text-lg text-base-content">Factura Timbrada con Éxito</h4>
    <p class="text-xs text-base-content/70">Certificada ante el SAT con folio fiscal digital</p>
  </div>

  <div class="p-3 rounded-2xl bg-base-200 border border-base-300 text-left font-mono text-xs space-y-1">
    <div class="text-[10px] text-base-content/60 uppercase">Folio Fiscal (UUID):</div>
    <div class="text-primary font-bold break-all">{stampedUuid}</div>
    <div class="text-[10px] text-base-content/60 uppercase pt-2">RFC Receptor:</div>
    <div class="text-base-content font-bold">{rfc.toUpperCase()}</div>
  </div>

  <InvoiceDownloadActions
    jobCode={jobCode}
    stampedUuid={stampedUuid}
    rfc={rfc}
    totalCents={totalCents}
    customerName={customerName}
  />
</div>
