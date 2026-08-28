<script lang="ts">
interface Props {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (user: { id: string; phone: string; role: 'customer' | 'collaborator' }) => void;
}

let { open, onClose, onAuthenticated }: Props = $props();

let step = $state<'phone' | 'otp'>('phone');
let phoneNumber = $state('');
let otpDigits = $state(['', '', '', '']);
let timerSeconds = $state(45);
let timerInterval = $state<number | null>(null);
let errorMessage = $state<string | null>(null);
let isSubmitting = $state(false);

function startCountdown() {
  timerSeconds = 45;
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (timerSeconds > 0) {
      timerSeconds--;
    } else {
      if (timerInterval) clearInterval(timerInterval);
    }
  }, 1000) as unknown as number;
}

function handlePhoneSubmit() {
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length !== 10) {
    errorMessage = 'Por favor ingresa un número celular de 10 dígitos (ej. 55 1234 5678).';
    return;
  }
  errorMessage = null;
  step = 'otp';
  startCountdown();

  // Try WebOTP API if available
  if (typeof window !== 'undefined' && 'credentials' in navigator) {
    try {
      const ac = new AbortController();
      (navigator.credentials as unknown as { get: (opts: unknown) => Promise<{ code?: string } | null> })
        .get({
          otp: { transport: ['sms'] },
          signal: ac.signal,
        })
        .then((otpObj) => {
          if (otpObj?.code) {
            const code = otpObj.code.trim();
            for (let i = 0; i < 4; i++) {
              otpDigits[i] = code[i] || '';
            }
            handleVerifyOtp();
          }
        })
        .catch(() => {});
    } catch (_) {}
  }
}

function handleDigitInput(index: number, e: Event) {
  const input = e.target as HTMLInputElement;
  const val = input.value.replace(/\D/g, '');
  otpDigits[index] = val ? val[val.length - 1] : '';

  if (val && index < 3) {
    const nextInput = document.getElementById(`otp-digit-${index + 1}`);
    nextInput?.focus();
  }

  if (otpDigits.every((d) => d !== '')) {
    handleVerifyOtp();
  }
}

function handleKeyDown(index: number, e: KeyboardEvent) {
  if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
    const prevInput = document.getElementById(`otp-digit-${index - 1}`);
    prevInput?.focus();
  }
}

function handlePaste(e: ClipboardEvent) {
  e.preventDefault();
  const pasted = e.clipboardData?.getData('text').replace(/\D/g, '') || '';
  if (pasted.length >= 4) {
    for (let i = 0; i < 4; i++) {
      otpDigits[i] = pasted[i];
    }
    handleVerifyOtp();
  }
}

function handleVerifyOtp() {
  const code = otpDigits.join('');
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
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onclick={onClose}>
    <!-- Modal Card -->
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
        <div class="space-y-4">
          <p class="text-xs text-base-content/70 leading-relaxed">
            Ingresa tu número celular mexicano. Te enviaremos un código SMS de 4 dígitos. Sin contraseñas que olvidar.
          </p>

          <div class="space-y-1.5">
            <label for="phone-input" class="text-[11px] font-bold text-base-content/80 uppercase tracking-wider">Número Celular (10 dígitos)</label>
            <div class="join w-full">
              <span class="join-item btn btn-neutral text-xs font-mono font-bold px-3">🇲🇽 +52</span>
              <input
                id="phone-input"
                type="tel"
                placeholder="55 1234 5678"
                maxlength="10"
                bind:value={phoneNumber}
                class="join-item input input-bordered w-full font-mono text-sm tracking-widest font-semibold"
                onkeydown={(e) => e.key === 'Enter' && handlePhoneSubmit()}
              />
            </div>
          </div>

          {#if errorMessage}
            <div class="alert alert-error text-xs p-3 rounded-xl">{errorMessage}</div>
          {/if}

          <button
            type="button"
            class="btn btn-primary btn-block rounded-2xl font-bold min-h-[56px] text-base shadow-md"
            onclick={handlePhoneSubmit}
          >
            Enviar Código por SMS
          </button>
        </div>
      {:else}
        <div class="space-y-4">
          <p class="text-xs text-base-content/70 leading-relaxed">
            Hemos enviado un código SMS de 4 dígitos al número <strong class="font-mono text-base-content">+52 {phoneNumber}</strong>.
          </p>

          <!-- 4 OTP Input Boxes -->
          <div class="flex justify-center gap-3 py-2" onpaste={handlePaste}>
            {#each [0, 1, 2, 3] as idx}
              <input
                id="otp-digit-{idx}"
                type="text"
                inputmode="numeric"
                maxlength="1"
                class="input input-bordered w-14 h-16 text-center text-2xl font-black font-mono rounded-2xl focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={otpDigits[idx]}
                oninput={(e) => handleDigitInput(idx, e)}
                onkeydown={(e) => handleKeyDown(idx, e)}
              />
            {/each}
          </div>

          {#if errorMessage}
            <div class="alert alert-error text-xs p-3 rounded-xl">{errorMessage}</div>
          {/if}

          <div class="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              class="text-primary font-bold hover:underline"
              onclick={() => { step = 'phone'; errorMessage = null; }}
            >
              ← Cambiar número
            </button>
            <button
              type="button"
              class="font-mono {timerSeconds > 0 ? 'text-base-content/40 cursor-not-allowed' : 'text-primary font-bold hover:underline'}"
              disabled={timerSeconds > 0}
              onclick={startCountdown}
            >
              {timerSeconds > 0 ? `Reenviar en ${timerSeconds}s` : 'Reenviar código'}
            </button>
          </div>

          <button
            type="button"
            class="btn btn-primary btn-block rounded-2xl font-bold min-h-[56px] text-base shadow-md"
            disabled={isSubmitting}
            onclick={handleVerifyOtp}
          >
            {#if isSubmitting}
              <span class="loading loading-spinner loading-sm"></span>
              <span>Validando...</span>
            {:else}
              <span>Verificar & Entrar</span>
            {/if}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}
