<script lang="ts">
interface Props {
  rfc: string;
  razonSocial: string;
  postalCode: string;
  regimenFiscal: string;
  usoCfdi: string;
  isStamping: boolean;
  onGenerate: () => void;
}

let {
  rfc = $bindable(),
  razonSocial = $bindable(),
  postalCode = $bindable(),
  regimenFiscal = $bindable(),
  usoCfdi = $bindable(),
  isStamping,
  onGenerate,
}: Props = $props();
</script>

<div class="space-y-4">
  <p class="text-xs text-base-content/70 leading-relaxed">
    Ingresa tus datos fiscales vigentes según tu Constancia de Situación Fiscal ante el SAT para timbrado inmediato.
  </p>

  <fieldset class="fieldset space-y-1">
    <legend class="fieldset-legend text-[11px] font-bold text-base-content/80 uppercase">RFC con Homoclave</legend>
    <input
      id="rfc-input"
      type="text"
      maxlength="13"
      bind:value={rfc}
      class="input input-sm w-full uppercase font-mono font-bold"
    />
  </fieldset>

  <fieldset class="fieldset space-y-1">
    <legend class="fieldset-legend text-[11px] font-bold text-base-content/80 uppercase">Nombre o Razón Social</legend>
    <input
      id="razon-input"
      type="text"
      bind:value={razonSocial}
      class="input input-sm w-full uppercase text-xs"
    />
  </fieldset>

  <fieldset class="fieldset space-y-1">
    <legend class="fieldset-legend text-[11px] font-bold text-base-content/80 uppercase">Código Postal Fiscal</legend>
    <input
      id="cp-input"
      type="text"
      maxlength="5"
      bind:value={postalCode}
      class="input input-sm w-full font-mono text-xs"
    />
  </fieldset>

  <fieldset class="fieldset space-y-1">
    <legend class="fieldset-legend text-[11px] font-bold text-base-content/80 uppercase">Régimen Fiscal SAT</legend>
    <select id="regimen-input" bind:value={regimenFiscal} class="select select-sm w-full text-xs">
      <option value="605">605 - Sueldos y Salarios</option>
      <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
      <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
      <option value="601">601 - General de Ley Personas Morales</option>
    </select>
  </fieldset>

  <fieldset class="fieldset space-y-1">
    <legend class="fieldset-legend text-[11px] font-bold text-base-content/80 uppercase">Uso de CFDI</legend>
    <select id="uso-input" bind:value={usoCfdi} class="select select-sm w-full text-xs">
      <option value="G03">G03 - Gastos en general</option>
      <option value="D01">D01 - Honorarios médicos</option>
      <option value="S01">S01 - Sin efectos fiscales</option>
    </select>
  </fieldset>

  <button
    type="button"
    class="btn btn-primary btn-block rounded-2xl font-bold min-h-[52px] text-sm shadow-md"
    disabled={isStamping}
    onclick={onGenerate}
  >
    {#if isStamping}
      <span class="loading loading-spinner loading-sm"></span>
      <span>Timbrando ante PAC SAT...</span>
    {:else}
      <span>Generar Factura CFDI 4.0 Inmediata</span>
    {/if}
  </button>
</div>



