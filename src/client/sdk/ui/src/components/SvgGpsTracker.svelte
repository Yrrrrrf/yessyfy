<script lang="ts">
interface Props {
  etaMinutes?: number;
  collaboratorName?: string;
  vehicleMode?: 'moto' | 'auto';
  progressPercent?: number; // 0 to 100
}

let {
  etaMinutes = 14,
  collaboratorName = 'Técnico',
  vehicleMode = 'moto',
  progressPercent = 65,
}: Props = $props();

const pinPosition = $derived.by(() => {
  // Trace curved path coordinates from start (60, 200) to customer (340, 70)
  const t = Math.max(0, Math.min(1, progressPercent / 100));
  // Quadratic bezier interpolation: P0=(60, 200), P1=(180, 220), P2=(340, 70)
  const x = (1 - t) * (1 - t) * 60 + 2 * (1 - t) * t * 180 + t * t * 340;
  const y = (1 - t) * (1 - t) * 200 + 2 * (1 - t) * t * 220 + t * t * 70;
  return { x: Math.round(x), y: Math.round(y) };
});
</script>

<div class="relative w-full h-64 rounded-3xl overflow-hidden bg-base-200 border border-base-300 shadow-inner">
  <!-- SVG Vector Map -->
  <svg class="w-full h-full" viewBox="0 0 400 260" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mapa de rastreo GPS en vivo">
    <title>Mapa de rastreo GPS en vivo</title>
    <!-- Grid Roads -->
    <g class="stroke-base-300" stroke-width="6" stroke-linecap="round">
      <line x1="30" y1="40" x2="370" y2="40" />
      <line x1="20" y1="120" x2="380" y2="120" />
      <line x1="30" y1="210" x2="370" y2="210" />
      <line x1="80" y1="20" x2="80" y2="240" />
      <line x1="200" y1="20" x2="200" y2="240" />
      <line x1="320" y1="20" x2="320" y2="240" />
    </g>

    <!-- Geofence 150m Circle around Destination -->
    <circle cx="340" cy="70" r="38" class="fill-primary/10 stroke-primary/30" stroke-dasharray="4 4" />

    <!-- Route Path Background -->
    <path
      d="M 60 200 Q 180 220 340 70"
      class="stroke-base-content/20"
      stroke-width="5"
      stroke-linecap="round"
    />

    <!-- Active Traversed Polyline -->
    <path
      d="M 60 200 Q 180 220 340 70"
      class="stroke-primary"
      stroke-width="5"
      stroke-linecap="round"
      stroke-dasharray="8 4"
    />

    <!-- Customer Destination Pin -->
    <g transform="translate(340, 70)">
      <circle r="12" class="fill-primary text-primary animate-ping opacity-50" />
      <circle r="8" class="fill-primary" />
      <circle r="4" class="fill-white" />
      <text y="-14" text-anchor="middle" class="fill-base-content font-bold text-[10px]">Tu Casa</text>
    </g>

    <!-- Moving Collaborator Pin -->
    <g transform="translate({pinPosition.x}, {pinPosition.y})">
      <circle r="14" class="fill-secondary shadow-lg" />
      <text y="4" text-anchor="middle" class="fill-white font-bold text-xs">
        {vehicleMode === 'moto' ? '🛵' : '🚗'}
      </text>
    </g>
  </svg>

  <!-- Floating Telemetry ETA Pill -->
  <div class="absolute top-3 left-3 bg-base-100/90 backdrop-blur-xs border border-base-300 rounded-2xl px-3.5 py-1.5 shadow-md flex items-center gap-2">
    <span class="relative flex h-2 w-2">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-primary"></span>
      <span class="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
    </span>
    <span class="text-xs font-black tracking-tight text-base-content font-mono">
      ETA: ~{etaMinutes} min
    </span>
    <span class="text-[10px] text-base-content/60 font-medium">({collaboratorName} en camino)</span>
  </div>
</div>



