<script lang="ts">
import type { LocationType, UrgencyLevel } from '@sdk/core';

interface Props {
  selectedLocation: LocationType;
  selectedUrgency: UrgencyLevel;
  onLocationChange: (loc: LocationType) => void;
  onUrgencyChange: (urg: UrgencyLevel) => void;
}

let { selectedLocation, selectedUrgency, onLocationChange, onUrgencyChange }: Props = $props();
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
  <div>
    <label for="location-select" class="block text-xs font-bold uppercase tracking-wider text-base-content/60 mb-1.5">2. Inmueble</label>
    <select
      id="location-select"
      value={selectedLocation}
      onchange={(e) => onLocationChange(e.currentTarget.value as LocationType)}
      class="select select-sm w-full text-xs"
    >
      <option value="residencial">Residencial (1.0x - Tarifa Base)</option>
      <option value="comercial">Comercial (1.2x)</option>
      <option value="premium">Premium / Plus (1.5x)</option>
    </select>
  </div>
  <div>
    <label for="urgency-select" class="block text-xs font-bold uppercase tracking-wider text-base-content/60 mb-1.5">3. Urgencia</label>
    <select
      id="urgency-select"
      value={selectedUrgency}
      onchange={(e) => onUrgencyChange(e.currentTarget.value as UrgencyLevel)}
      class="select select-sm w-full text-xs"
    >
      <option value="normal">Normal (1.0x)</option>
      <option value="mismo_dia">Mismo Día (1.3x)</option>
      <option value="emergencia_24_7">Emergencia 24/7 (1.8x)</option>
    </select>
  </div>
</div>
