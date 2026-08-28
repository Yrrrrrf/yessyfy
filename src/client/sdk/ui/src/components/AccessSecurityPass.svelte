<script lang="ts">
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

let copiedNotice = $state(false);

function sharePass() {
  const message = `*PASE DE ACCESO RESIDENCIAL — YESSYFY*\n\nEstimada Vigilancia/Conserje:\nAutorizo el acceso del colaborador técnico:\n- *Nombre:* ${collaboratorName}\n- *Folio Verificado:* ${verificationCode}\n- *Vehículo:* ${vehicleType} (${vehicleModel})\n- *Placas:* ${plateNumber}\n- *Destino:* ${destinationAddress}\n\nValidado ante Yessyfy CDMX bajo contrato de servicios con Garantía Escrow.`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    navigator.share({
      title: 'Pase de Acceso para Vigilancia',
      text: message,
    }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(message);
    copiedNotice = true;
    setTimeout(() => copiedNotice = false, 3000);
  }
}
</script>

{#if open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onclick={onClose}>
    <!-- Pass Card -->
    <div
      class="bg-base-100 border-2 border-primary/40 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-5 relative overflow-hidden"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Background Watermark -->
      <div class="absolute -right-8 -top-8 text-8xl opacity-5 pointer-events-none">🛡️</div>

      <!-- Header Seal -->
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

      <!-- Pro Profile Card -->
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

        <!-- Vehicle Box -->
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

      <!-- Destination Box -->
      <div class="p-3 rounded-xl bg-base-200 border border-base-300 text-xs">
        <span class="text-[10px] text-base-content/60 block uppercase font-bold">Destino Autorizado</span>
        <span class="font-medium text-base-content">{destinationAddress}</span>
      </div>

      {#if copiedNotice}
        <div class="alert alert-success text-xs p-2.5 rounded-xl font-bold">
          ✓ Texto copiado para pegar en WhatsApp del conserje
        </div>
      {/if}

      <!-- Action Button -->
      <button
        type="button"
        class="btn btn-primary btn-block rounded-2xl font-bold min-h-[52px] text-sm shadow-md"
        onclick={sharePass}
      >
        📲 Compartir con Caseta por WhatsApp
      </button>
    </div>
  </div>
{/if}
