<script lang="ts">
interface Props {
  collaboratorName: string;
  vehicleModel: string;
  plateNumber: string;
  destinationAddress: string;
}

let {
  collaboratorName,
  vehicleModel,
  plateNumber,
  destinationAddress,
}: Props = $props();
</script>

<div class="p-4 rounded-2xl bg-base-200/80 border border-base-300 space-y-3">
  <div class="flex items-center gap-3">
    <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-accent text-white font-black text-xl flex items-center justify-center shadow-md">
      {collaboratorName[0]}
    </div>
    <div>
      <h4 class="font-extrabold text-sm text-base-content">{collaboratorName}</h4>
      <div class="flex flex-wrap gap-1 mt-1">
        <span class="badge badge-success badge-xs font-bold text-[9px]">INE Verificado</span>
        <span class="badge badge-info badge-xs font-bold text-[9px]">Antecedentes OK</span>
      </div>
    </div>
  </div>

  <div class="pt-2 border-t border-base-300/80 grid grid-cols-2 gap-2 text-xs">
    <div>
      <span class="text-[10px] text-base-content/60 block">Transporte</span>
      <span class="font-semibold text-base-content">{vehicleModel}</span>
    </div>
    <div>
      <span class="text-[10px] text-base-content/60 block">Placas Oficiales</span>
      <span class="badge badge-neutral font-mono font-bold text-xs">{plateNumber}</span>
    </div>
  </div>
</div>

<div class="p-3 rounded-xl bg-base-200 border border-base-300 text-xs">
  <span class="text-[10px] text-base-content/60 block uppercase font-bold">Destino Autorizado</span>
  <span class="font-medium text-base-content">{destinationAddress}</span>
</div>



