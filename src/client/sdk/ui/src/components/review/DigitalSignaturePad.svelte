<script lang="ts">
import { onMount } from 'svelte';

interface Props {
  hasSigned: boolean;
  onSignedChange?: (signed: boolean) => void;
  canvasElement?: HTMLCanvasElement | null;
}

let { hasSigned = $bindable(), onSignedChange, canvasElement = $bindable(null) }: Props = $props();

let isDrawing = $state(false);

export function clear(): void {
  if (!canvasElement) return;
  const ctx = canvasElement.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  hasSigned = false;
  onSignedChange?.(false);
}

function startDrawing(e: MouseEvent | TouchEvent) {
  isDrawing = true;
  hasSigned = true;
  onSignedChange?.(true);
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

onMount(() => {
  if (canvasElement) {
    canvasElement.width = canvasElement.offsetWidth || 350;
    canvasElement.height = canvasElement.offsetHeight || 120;
  }
});
</script>

<div class="space-y-2">
  <div class="flex items-center justify-between">
    <span class="text-xs font-bold uppercase text-base-content/70">Firma Digital de Conformidad:</span>
    {#if hasSigned}
      <button type="button" class="btn btn-ghost btn-xs text-error" onclick={clear}>Borrar Firma</button>
    {/if}
  </div>
  <div class="relative border-2 border-dashed border-base-300 rounded-2xl bg-base-100 p-1">
    <canvas
      bind:this={canvasElement}
      class="w-full h-28 cursor-crosshair touch-none"
      onmousedown={startDrawing}
      onmouseup={stopDrawing}
      onmouseleave={stopDrawing}
      onmousemove={draw}
      ontouchstart={startDrawing}
      ontouchend={stopDrawing}
      ontouchmove={draw}
    ></canvas>
    {#if !hasSigned}
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-base-content/30 italic">
        ✍️ Firma aquí con tu dedo o mouse para liberar el pago
      </div>
    {/if}
  </div>
</div>
