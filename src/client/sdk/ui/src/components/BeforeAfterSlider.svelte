<script lang="ts">
interface Props {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}

let {
  beforeUrl,
  afterUrl,
  beforeLabel = 'Antes (Diagnóstico)',
  afterLabel = 'Después (Garantizado)',
}: Props = $props();

let sliderPosition = $state(50); // percentage 0 to 100
let isDragging = $state(false);
let containerWidth = $state(0);

function handleMove(e: MouseEvent | TouchEvent) {
  if (!isDragging && e.type !== 'touchmove') return;

  const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
  const container = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const rawX = clientX - container.left;
  const percentage = Math.max(0, Math.min(100, (rawX / container.width) * 100));
  sliderPosition = Math.round(percentage);
}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="relative w-full h-64 md:h-80 rounded-3xl overflow-hidden select-none border border-base-300 shadow-md touch-none cursor-ew-resize"
  bind:clientWidth={containerWidth}
  onmousedown={() => isDragging = true}
  onmouseup={() => isDragging = false}
  onmouseleave={() => isDragging = false}
  onmousemove={handleMove}
  ontouchmove={handleMove}
>
  <!-- After Image (Background) -->
  <img
    src={afterUrl}
    alt="Trabajo Terminado"
    class="absolute inset-0 w-full h-full object-cover pointer-events-none"
  />
  <span class="absolute top-3 right-3 badge badge-success badge-sm font-bold shadow">
    {afterLabel}
  </span>

  <!-- Before Image (Clipped Overlay) -->
  <div
    class="absolute inset-0 h-full overflow-hidden pointer-events-none"
    style="width: {sliderPosition}%;"
  >
    <img
      src={beforeUrl}
      alt="Trabajo Inicial"
      class="absolute inset-0 h-full object-cover max-w-none"
      style="width: {containerWidth ? `${containerWidth}px` : '100%'};"
    />
    <span class="absolute top-3 left-3 badge badge-neutral badge-sm font-bold shadow">
      {beforeLabel}
    </span>
  </div>

  <!-- Divider Line & Handle -->
  <div
    class="absolute top-0 bottom-0 w-1 bg-white shadow-2xl pointer-events-none"
    style="left: {sliderPosition}%; transform: translateX(-50%);"
  >
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-primary text-primary-content font-bold flex items-center justify-center shadow-lg border-2 border-white text-xs">
      ↔
    </div>
  </div>
</div>
