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

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onclick={onClose}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="bg-base-100 border border-base-300 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-6"
      onclick={(e) => e.stopPropagation()}
    >
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
  </div>
{/if}
