<script lang="ts">
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
let tipCents = $state(5000); // $50 MXN default
let comment = $state('');
let legalAgreed = $state(true);

let canvasElement = $state<HTMLCanvasElement | null>(null);
let isDrawing = $state(false);
let hasSigned = $state(false);

const AVAILABLE_TAGS = [
  'Limpieza Impecable',
  'Puntualidad Excelente',
  'Refacciones Originales',
  'Trato Respetuoso',
  'Explicación Técnica Clara',
  'Cuidado del Inmueble',
];

function toggleTag(tag: string) {
  if (selectedTags.includes(tag)) {
    selectedTags = selectedTags.filter((t) => t !== tag);
  } else {
    selectedTags = [...selectedTags, tag];
  }
}

function startDrawing(e: MouseEvent | TouchEvent) {
  isDrawing = true;
  hasSigned = true;
  draw(e);
}

function stopDrawing() {
  isDrawing = false;
  if (canvasElement) {
    const ctx = canvasElement.getContext('2d');
    ctx?.beginPath();
  }
}

function draw(e: MouseEvent | TouchEvent) {
  if (!isDrawing || !canvasElement) return;
  const ctx = canvasElement.getContext('2d');
  if (!ctx) return;

  const rect = canvasElement.getBoundingClientRect();
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#0b3d47';

  ctx.lineTo(clientX - rect.left, clientY - rect.top);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(clientX - rect.left, clientY - rect.top);
}

function clearSignature() {
  if (!canvasElement) return;
  const ctx = canvasElement.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  hasSigned = false;
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
</script>

{#if open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onclick={onClose}>
    <div
      class="bg-base-100 border border-base-300 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-black text-base-content">Validación de Calidad & Firma</h3>
          <p class="text-xs text-base-content/60">Servicio #{jobCode} • {collaboratorName}</p>
        </div>
        <button type="button" class="btn btn-ghost btn-circle btn-sm" onclick={onClose}>✕</button>
      </div>

      <!-- 1-5 Star Interactive Selector -->
      <div class="card bg-base-200 p-4 rounded-2xl text-center space-y-2">
        <span class="text-xs font-bold uppercase text-base-content/70">¿Cómo calificarías el servicio?</span>
        <div class="flex justify-center gap-2 text-3xl">
          {#each [1, 2, 3, 4, 5] as star}
            <button
              type="button"
              class="cursor-pointer transition-transform hover:scale-125 {star <= rating ? 'text-warning' : 'text-base-content/20'}"
              onclick={() => rating = star}
            >
              ★
            </button>
          {/each}
        </div>
        <span class="text-xs font-bold text-primary font-mono">
          {rating === 5 ? '¡Excelente servicio!' : rating === 4 ? 'Muy buen servicio' : rating === 3 ? 'Aceptable' : 'Deficiente'}
        </span>
      </div>

      <!-- Feedback Tags -->
      <div class="space-y-2">
        <span class="text-xs font-bold uppercase text-base-content/70 block">Aspectos Destacados:</span>
        <div class="flex flex-wrap gap-1.5">
          {#each AVAILABLE_TAGS as tag}
            <button
              type="button"
              class="btn btn-xs rounded-full text-[11px] {selectedTags.includes(tag) ? 'btn-primary' : 'btn-ghost border border-base-300'}"
              onclick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          {/each}
        </div>
      </div>

      <!-- Tip Selector -->
      <div class="space-y-2">
        <span class="text-xs font-bold uppercase text-base-content/70 block">Propina Voluntaria para el Colaborador:</span>
        <div class="grid grid-cols-4 gap-2">
          {#each [{ label: 'Sin propina', cents: 0 }, { label: '$50 MXN', cents: 5000 }, { label: '$100 MXN', cents: 10000 }, { label: '$200 MXN', cents: 20000 }] as t}
            <button
              type="button"
              class="btn btn-sm rounded-xl font-bold text-xs {tipCents === t.cents ? 'btn-primary' : 'btn-neutral btn-outline'}"
              onclick={() => tipCents = t.cents}
            >
              {t.label}
            </button>
          {/each}
        </div>
      </div>

      <!-- Digital Signature Canvas -->
      <div class="space-y-2">
        <div class="flex justify-between items-center">
          <span class="text-xs font-bold uppercase text-base-content/70">Firma Táctil de Conformidad (NOM-151):</span>
          <button type="button" class="text-[10px] text-primary font-bold hover:underline" onclick={clearSignature}>
            Limpiar firma
          </button>
        </div>
        <div class="border-2 border-dashed border-base-300 rounded-2xl overflow-hidden bg-base-100 h-28 relative">
          <canvas
            bind:this={canvasElement}
            width={440}
            height={112}
            class="w-full h-full cursor-crosshair"
            onmousedown={startDrawing}
            onmousemove={draw}
            onmouseup={stopDrawing}
            onmouseleave={stopDrawing}
            ontouchstart={startDrawing}
            ontouchmove={draw}
            ontouchend={stopDrawing}
          ></canvas>
          {#if !hasSigned}
            <div class="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-base-content/30 italic">
              Traza tu firma aquí con el dedo o ratón
            </div>
          {/if}
        </div>
      </div>

      <!-- Legal Checkbox -->
      <label class="flex items-start gap-2.5 cursor-pointer text-xs text-base-content/80">
        <input type="checkbox" bind:checked={legalAgreed} class="checkbox checkbox-primary checkbox-sm mt-0.5" />
        <span>Doy por recibido el servicio a entera satisfacción y autorizo la liberación de los fondos en custodia Escrow al profesional independiente.</span>
      </label>

      <!-- Submit Button -->
      <button
        type="button"
        class="btn btn-primary btn-block rounded-2xl font-bold min-h-[56px] text-base shadow-lg shadow-primary/20"
        disabled={!legalAgreed}
        onclick={handleSubmit}
      >
        Liberar Escrow & Activar Garantía (30 Días)
      </button>
    </div>
  </div>
{/if}
