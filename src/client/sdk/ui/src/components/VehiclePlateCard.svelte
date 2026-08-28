<script lang="ts">
interface Props {
  plateNumber: string;
  vehicleType?: 'moto' | 'auto' | 'camioneta';
  modelDescription?: string;
}

let { plateNumber, vehicleType = 'moto', modelDescription = 'Transporte Autorizado' }: Props = $props();

const icon = $derived(() => {
  switch (vehicleType) {
    case 'moto':
      return '🛵';
    case 'auto':
      return '🚗';
    case 'camioneta':
      return '🛻';
  }
});
</script>

<div class="inline-flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-base-200 border border-base-300">
  <span class="text-2xl">{icon()}</span>
  <div>
    <div class="text-[10px] uppercase font-bold text-base-content/60 leading-none">Placas Oficiales</div>
    <div class="font-mono font-black text-sm tracking-wider text-base-content mt-0.5">{plateNumber}</div>
  </div>
</div>
