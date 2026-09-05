<script lang="ts">
import StarRatingSelector from './review/StarRatingSelector.svelte';
import ReviewTagChips from './review/ReviewTagChips.svelte';
import DigitalSignaturePad from './review/DigitalSignaturePad.svelte';
import TipSelector from './review/TipSelector.svelte';

interface Props {
  open: boolean;
  collaboratorName?: string;
  jobCode?: string;
  onSubmit: (data: {
    rating: number;
    tags: string[];
    tipCents: number;
    signatureDataUrl: string;
    comment: string;
  }) => void;
  onClose: () => void;
}

let {
  open,
  collaboratorName = 'Roberto Morales Ramírez',
  jobCode = 'YSF-ORD-001',
  onSubmit,
  onClose,
}: Props = $props();

let rating = $state(5);
let selectedTags = $state<string[]>(['Limpieza Impecable', 'Puntualidad Excelente']);
let tipCents = $state(5000);
let comment = $state('');
let legalAgreed = $state(true);
let hasSigned = $state(false);
let canvasElement = $state<HTMLCanvasElement | null>(null);

function toggleTag(tag: string) {
  if (selectedTags.includes(tag)) {
    selectedTags = selectedTags.filter((t) => t !== tag);
  } else {
    selectedTags = [...selectedTags, tag];
  }
}

function handleSubmit() {
  const signatureDataUrl = canvasElement ? canvasElement.toDataURL('image/png') : '';
  onSubmit({
    rating,
    tags: selectedTags,
    tipCents,
    signatureDataUrl,
    comment,
  });
}
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
</script>

<dialog
  bind:this={dialogEl}
  class="modal modal-bottom sm:modal-middle"
  oncancel={handleCancel}
  onclose={() => {
    if (open) onClose();
  }}
>
  <div
    class="modal-box bg-base-100 border border-base-300 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"
  >
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-black text-base-content">Validación de Calidad & Firma</h3>
          <p class="text-xs text-base-content/60">Servicio #{jobCode} • {collaboratorName}</p>
        </div>
        <button type="button" class="btn btn-ghost btn-circle btn-sm" onclick={onClose}>✕</button>
      </div>

      <StarRatingSelector
        rating={rating}
        onRatingChange={(r) => rating = r}
      />

      <ReviewTagChips
        selectedTags={selectedTags}
        onToggleTag={toggleTag}
      />

      <fieldset class="fieldset space-y-1.5">
        <legend class="fieldset-legend text-xs font-bold uppercase text-base-content/70">Comentario o Retroalimentación (Opcional):</legend>
        <textarea
          placeholder="Escribe aquí cualquier detalle sobre el servicio realizado..."
          bind:value={comment}
          rows="2"
          class="textarea w-full text-xs rounded-xl"
        ></textarea>
      </fieldset>

      <TipSelector
        tipCents={tipCents}
        onTipChange={(c) => tipCents = c}
      />

      <DigitalSignaturePad
        bind:hasSigned
        bind:canvasElement
      />

      <label class="flex items-start gap-2.5 cursor-pointer bg-base-200/50 p-3 rounded-xl border border-base-300 text-xs">
        <input type="checkbox" bind:checked={legalAgreed} class="checkbox checkbox-primary checkbox-sm mt-0.5" />
        <span class="text-base-content/70 leading-tight">
          Acepto de conformidad el servicio prestado por el profesional independiente. Autorizo la liberación del pago en Escrow y la activación de mi Garantía Yessyfy (30 días).
        </span>
      </label>

      <button
        type="button"
        class="btn btn-primary btn-block rounded-2xl font-bold min-h-[56px] text-sm shadow-lg shadow-primary/20"
        disabled={!hasSigned || !legalAgreed}
        onclick={handleSubmit}
      >
        ✓ Firmar Conformidad & Liberar Pago Escrow
      </button>
    </div>
  <form method="dialog" class="modal-backdrop">
    <button type="button" onclick={onClose}>close</button>
  </form>
</dialog>
