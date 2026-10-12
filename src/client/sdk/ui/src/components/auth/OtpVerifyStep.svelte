<script lang="ts">
import { onDestroy, onMount } from 'svelte';
import { listenForWebOtp } from './webOtp.ts';

interface Props {
  phoneNumber: string;
  errorMessage: string | null;
  isSubmitting: boolean;
  onVerify: (code: string) => void;
  onBack: () => void;
  onResend: () => void;
}

let { phoneNumber, errorMessage, isSubmitting, onVerify, onBack, onResend }: Props = $props();

let otpDigits = $state(['', '', '', '']);
let timerSeconds = $state(45);
let timerInterval: number | null = null;
let abortController: AbortController | null = null;

function startCountdown() {
  timerSeconds = 45;
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (timerSeconds > 0) {
      timerSeconds--;
    } else if (timerInterval) {
      clearInterval(timerInterval);
    }
  }, 1000) as unknown as number;
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
    onVerify(otpDigits.join(''));
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
    onVerify(otpDigits.join(''));
  }
}

function handleResendClick() {
  startCountdown();
  onResend();
}

onMount(() => {
  startCountdown();
  abortController = new AbortController();
  listenForWebOtp(abortController.signal).then((code) => {
    if (code && code.length >= 4) {
      for (let i = 0; i < 4; i++) {
        otpDigits[i] = code[i];
      }
      onVerify(otpDigits.join(''));
    }
  });
});

onDestroy(() => {
  if (timerInterval) clearInterval(timerInterval);
  abortController?.abort();
});
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between text-xs text-base-content/70">
    <span>Código enviado al <strong class="font-mono text-base-content">+52 {phoneNumber}</strong></span>
    <button type="button" class="btn btn-ghost btn-xs text-primary font-bold" onclick={onBack}>Cambiar</button>
  </div>

  <div class="flex justify-center gap-3 py-2" onpaste={handlePaste}>
    {#each [0, 1, 2, 3] as idx}
      <input
        id={`otp-digit-${idx}`}
        type="tel"
        maxlength="1"
        class="input w-14 h-16 text-center text-2xl font-black font-mono rounded-2xl focus:border-primary focus:ring-2 focus:ring-primary/20"
        value={otpDigits[idx]}
        oninput={(e) => handleDigitInput(idx, e)}
        onkeydown={(e) => handleKeyDown(idx, e)}
      />
    {/each}
  </div>

  {#if errorMessage}
    <div class="alert alert-error alert-soft text-xs py-2">
      <span>{errorMessage}</span>
    </div>
  {/if}

  <button
    type="button"
    class="btn btn-primary btn-block rounded-2xl font-bold min-h-[52px] text-sm"
    disabled={isSubmitting || otpDigits.some((d) => !d)}
    onclick={() => onVerify(otpDigits.join(''))}
  >
    {#if isSubmitting}
      <span class="loading loading-spinner loading-sm"></span>
      Verificando...
    {:else}
      Verificar Código SMS ✓
    {/if}
  </button>

  <div class="text-center text-xs text-base-content/60 pt-2">
    {#if timerSeconds > 0}
      <span>Reenviar código en <strong class="font-mono text-base-content">{timerSeconds}s</strong></span>
    {:else}
      <button type="button" class="link link-primary font-bold" onclick={handleResendClick}>Reenviar código SMS</button>
    {/if}
  </div>
</div>



