<script lang="ts">
interface Props {
  addressText: string;
  gateInstructions: string;
}

let { addressText = $bindable(), gateInstructions = $bindable() }: Props = $props();
</script>

<fieldset class="fieldset space-y-2">
  <legend class="fieldset-legend text-xs font-bold uppercase tracking-wider text-base-content/60">5. Domicilio & Acceso (CDMX)</legend>
  <input
    type="text"
    placeholder="Calle, No. Ext/Int, Colonia"
    bind:value={addressText}
    class="input input-sm w-full text-xs"
  />
  <input
    type="text"
    placeholder="Instrucciones para caseta / vigilancia (opcional)"
    bind:value={gateInstructions}
    class="input input-sm w-full text-xs"
  />
</fieldset>



