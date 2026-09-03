<script lang="ts">
interface Props {
  collaboratorName: string;
  verificationCode: string;
  vehicleType: string;
  vehicleModel: string;
  plateNumber: string;
  destinationAddress: string;
}

let {
  collaboratorName,
  verificationCode,
  vehicleType,
  vehicleModel,
  plateNumber,
  destinationAddress,
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
    if (typeof window !== 'undefined') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
    }
  }
}
</script>

<div class="space-y-3">
  {#if copiedNotice}
    <div class="alert alert-success text-xs p-2.5 rounded-xl font-bold">
      ✓ Texto copiado para pegar en WhatsApp del conserje
    </div>
  {/if}

  <button
    type="button"
    class="btn btn-primary btn-block rounded-2xl font-bold min-h-[52px] text-sm shadow-md"
    onclick={sharePass}
  >
    📲 Compartir con Caseta por WhatsApp
  </button>
</div>
