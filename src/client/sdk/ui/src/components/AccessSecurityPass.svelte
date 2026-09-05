<script lang="ts">
import SecurityPassCard from './pass/SecurityPassCard.svelte';
import SharePassActions from './pass/SharePassActions.svelte';

interface Props {
  open: boolean;
  collaboratorName?: string;
  verificationCode?: string;
  vehicleType?: string;
  vehicleModel?: string;
  plateNumber?: string;
  destinationAddress?: string;
  onClose: () => void;
}

let {
  open,
  collaboratorName = 'Roberto Morales Ramírez',
  verificationCode = 'YSF-VER-0982',
  vehicleType = 'Motocicleta',
  vehicleModel = 'Italika FT150 Roja',
  plateNumber = 'M-892-CDMX',
  destinationAddress = 'Av. Horacio 1420, Depto 501, Polanco',
  onClose,
}: Props = $props();
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
  class="modal modal-middle"
  oncancel={handleCancel}
  onclose={() => {
    if (open) onClose();
  }}
>
  <div
    class="modal-box bg-base-100 border-2 border-primary/40 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-5 relative overflow-hidden"
  >
    <div class="absolute -right-8 -top-8 text-8xl opacity-5 pointer-events-none">🛡️</div>

    <div class="flex items-center justify-between border-b border-base-300 pb-4">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm">Y</div>
        <div>
          <h3 class="font-black text-sm text-base-content">Pase Digital para Caseta</h3>
          <span class="text-[10px] text-base-content/60 font-mono">Folio: {verificationCode}</span>
        </div>
      </div>
      <button type="button" class="btn btn-ghost btn-circle btn-sm" onclick={onClose}>✕</button>
    </div>

    <SecurityPassCard
      collaboratorName={collaboratorName}
      vehicleModel={vehicleModel}
      plateNumber={plateNumber}
      destinationAddress={destinationAddress}
    />

    <SharePassActions
      collaboratorName={collaboratorName}
      verificationCode={verificationCode}
      vehicleType={vehicleType}
      vehicleModel={vehicleModel}
      plateNumber={plateNumber}
      destinationAddress={destinationAddress}
    />
  </div>
  <form method="dialog" class="modal-backdrop">
    <button type="button" onclick={onClose}>close</button>
  </form>
</dialog>
