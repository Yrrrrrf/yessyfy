<script lang="ts">
interface Props {
  tipCents: number;
  onTipChange: (c: number) => void;
}

let { tipCents, onTipChange }: Props = $props();

const TIP_OPTIONS = [
  { label: 'Sin propina', cents: 0 },
  { label: '+$30 MXN', cents: 3000 },
  { label: '+$50 MXN (Sugerida)', cents: 5000 },
  { label: '+$100 MXN', cents: 10000 },
];
</script>

<div class="space-y-2">
  <span class="text-xs font-bold uppercase text-base-content/70 block">Propina al Colaborador (100% íntegra):</span>
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
    {#each TIP_OPTIONS as opt}
      <button
        type="button"
        class="btn btn-sm rounded-xl text-xs {tipCents === opt.cents ? 'btn-primary' : 'btn-ghost border border-base-300'}"
        onclick={() => onTipChange(opt.cents)}
      >
        {opt.label}
      </button>
    {/each}
  </div>
</div>
