<script lang="ts">
import PhoneInputStep from './auth/PhoneInputStep.svelte';
import OtpVerifyStep from './auth/OtpVerifyStep.svelte';

interface Props {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (user: { id: string; phone: string; role: 'customer' | 'collaborator' }) => void;
}

let { open, onClose, onAuthenticated }: Props = $props();

let step = $state<'phone' | 'otp'>('phone');
let phoneNumber = $state('');
let errorMessage = $state<string | null>(null);
let isSubmitting = $state(false);

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

function handlePhoneSubmit() {
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length !== 10) {
    errorMessage = 'Por favor ingresa un número celular de 10 dígitos (ej. 55 1234 5678).';
    return;
  }
  errorMessage = null;
  step = 'otp';
}

function handleVerifyOtp(code: string) {
  if (code.length < 4) {
    errorMessage = 'Ingresa el código completo de 4 dígitos.';
    return;
  }
  isSubmitting = true;
  errorMessage = null;

  setTimeout(() => {
    isSubmitting = false;
    onAuthenticated({
      id: `usr_cust_${Math.random().toString(36).substring(2, 7)}`,
      phone: `+52${phoneNumber.replace(/\D/g, '')}`,
      role: 'customer',
    });
    onClose();
  }, 600);
}
</script>

<dialog
  bind:this={dialogEl}
  class="modal modal-bottom sm:modal-middle"
  oncancel={handleCancel}
  onclose={() => {
    if (open) onClose();
  }}
>
  <div class="modal-box bg-base-100 border border-base-300 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm">Y</span>
        <h3 class="text-lg font-black text-base-content">
          {step === 'phone' ? 'Iniciar Sesión con Celular' : 'Verificar Código SMS'}
        </h3>
      </div>
      <button type="button" class="btn btn-ghost btn-circle btn-sm" onclick={onClose}>✕</button>
    </div>

    {#if step === 'phone'}
      <PhoneInputStep bind:phoneNumber errorMessage={errorMessage} onSubmit={handlePhoneSubmit} />
    {:else}
      <OtpVerifyStep
        phoneNumber={phoneNumber}
        errorMessage={errorMessage}
        isSubmitting={isSubmitting}
        onVerify={handleVerifyOtp}
        onBack={() => { step = 'phone'; errorMessage = null; }}
        onResend={() => { errorMessage = null; }}
      />
    {/if}
  </div>
  <form method="dialog" class="modal-backdrop">
    <button type="button" onclick={onClose}>close</button>
  </form>
</dialog>



