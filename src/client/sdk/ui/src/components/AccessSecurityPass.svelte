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
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onclick={onClose}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="bg-base-100 border-2 border-primary/40 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-5 relative overflow-hidden"
      onclick={(e) => e.stopPropagation()}
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
  </div>
{/if}
