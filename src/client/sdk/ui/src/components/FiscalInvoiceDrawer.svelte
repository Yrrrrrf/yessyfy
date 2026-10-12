<script lang="ts">
import { formatMxn } from '@sdk/core';
import FiscalDataForm from './fiscal/FiscalDataForm.svelte';
import SatPacStampingPreview from './fiscal/SatPacStampingPreview.svelte';

interface Props {
  open: boolean;
  jobCode: string;
  totalCents: number;
  onClose: () => void;
  onInvoiceGenerated?: (data: { rfc: string; uuid: string; pdfUrl: string; xmlUrl: string }) => void;
}

let {
  open,
  jobCode,
  totalCents,
  onClose,
  onInvoiceGenerated,
}: Props = $props();

let rfc = $state('GARM880415XYZ');
let razonSocial = $state('MARIANA GARZA LOZANO');
let postalCode = $state('11550');
let regimenFiscal = $state('612');
let usoCfdi = $state('G03');

let isStamping = $state(false);
let stampedUuid = $state<string | null>(null);

let dialogEl = $state<HTMLDialogElement | null>(null);

$effect(() => {
  if (open) {
    if (dialogEl && !dialogEl.open) {
      dialogEl.showModal();
    }
  } else {
    if (dialogEl?.open) {
      dialogEl.close();
    }
  }
});

function handleCancel(e: Event) {
  e.preventDefault();
  onClose();
}

function handleGenerateInvoice() {
  if (!rfc || rfc.length < 12) return;

  isStamping = true;
  setTimeout(() => {
    isStamping = false;
    const uuid = `YSF-${crypto.randomUUID().toUpperCase()}`;
    stampedUuid = uuid;
    onInvoiceGenerated?.({
      rfc: rfc.toUpperCase(),
      uuid,
      pdfUrl: '#',
      xmlUrl: '#',
    });
  }, 900);
}
</script>

<dialog
  bind:this={dialogEl}
  class="modal modal-end"
  oncancel={handleCancel}
  onclose={() => {
    if (open) onClose();
  }}
>
  <div
    class="modal-box bg-base-100 border-l border-base-300 w-full sm:max-w-md h-full flex flex-col shadow-2xl p-6 space-y-6 overflow-y-auto"
  >
    <div class="flex items-center justify-between border-b border-base-300 pb-4">
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 rounded-xl bg-accent text-accent-content font-black flex items-center justify-center text-sm shadow">
          SAT
        </div>
        <div>
          <h3 class="font-black text-base text-base-content">Facturación Electrónica (CFDI 4.0)</h3>
          <p class="text-[11px] text-base-content/60 font-mono">Orden #{jobCode} • {formatMxn(totalCents)}</p>
        </div>
      </div>
      <button type="button" class="btn btn-ghost btn-circle btn-sm" onclick={onClose}>✕</button>
    </div>

    {#if stampedUuid}
      <SatPacStampingPreview
        jobCode={jobCode}
        stampedUuid={stampedUuid}
        rfc={rfc}
        totalCents={totalCents}
        customerName={razonSocial}
      />
    {:else}
      <FiscalDataForm
        bind:rfc
        bind:razonSocial
        bind:postalCode
        bind:regimenFiscal
        bind:usoCfdi
        isStamping={isStamping}
        onGenerate={handleGenerateInvoice}
      />
    {/if}
  </div>
  <form method="dialog" class="modal-backdrop">
    <button type="button" onclick={onClose}>close</button>
  </form>
</dialog>



