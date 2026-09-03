<script lang="ts">
interface Props {
  phoneNumber: string;
  errorMessage: string | null;
  onSubmit: () => void;
}

let { phoneNumber = $bindable(), errorMessage, onSubmit }: Props = $props();
</script>

<div class="space-y-4">
  <p class="text-xs text-base-content/70 leading-relaxed">
    Ingresa tu número celular mexicano. Te enviaremos un código SMS de 4 dígitos. Sin contraseñas que olvidar.
  </p>

  <fieldset class="fieldset space-y-1.5">
    <legend class="fieldset-legend text-[11px] font-bold text-base-content/80 uppercase tracking-wider">Número Celular (10 dígitos)</legend>
    <div class="join w-full">
      <span class="join-item btn btn-neutral text-xs font-mono font-bold px-3">🇲🇽 +52</span>
      <input
        id="phone-input"
        type="tel"
        placeholder="55 1234 5678"
        class="input join-item flex-1 text-sm font-mono tracking-wider font-semibold"
        bind:value={phoneNumber}
        onkeydown={(e) => e.key === 'Enter' && onSubmit()}
      />
    </div>
  </fieldset>

  {#if errorMessage}
    <div class="alert alert-error alert-soft text-xs py-2">
      <span>{errorMessage}</span>
    </div>
  {/if}

  <button
    type="button"
    class="btn btn-primary btn-block rounded-2xl font-bold min-h-[52px] text-sm"
    onclick={onSubmit}
  >
    Continuar con SMS →
  </button>
</div>
