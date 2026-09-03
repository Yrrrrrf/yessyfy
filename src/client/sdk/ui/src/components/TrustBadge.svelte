<script lang="ts">
export type TrustBadgeKind = 'kyc_verified' | 'insurance_500k' | 'warranty_30d';

interface Props {
  kind: TrustBadgeKind;
  variant?: 'compact' | 'full';
}

let { kind, variant = 'compact' }: Props = $props();

const data = $derived.by(() => {
  switch (kind) {
    case 'kyc_verified':
      return {
        icon: '🛡️',
        title: 'Técnico Verificado',
        subtitle: 'INE, antecedentes y examen de oficio validados',
        colorClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      };
    case 'insurance_500k':
      return {
        icon: '🏛️',
        title: 'Seguro RC $500k MXN',
        subtitle: 'Póliza activa de responsabilidad civil para tu hogar',
        colorClass: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
      };
    case 'warranty_30d':
      return {
        icon: '✅',
        title: 'Garantía 30 Días',
        subtitle: 'Si falla o queda mal, volvemos sin costo adicional',
        colorClass: 'border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300',
      };
  }
});
</script>

{#if variant === 'compact'}
  <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold {data.colorClass}">
    <span>{data.icon}</span>
    <span>{data.title}</span>
  </div>
{:else}
  <div class="flex items-start gap-3 p-3.5 rounded-2xl border {data.colorClass}">
    <span class="text-2xl mt-0.5">{data.icon}</span>
    <div>
      <h4 class="font-bold text-sm leading-tight">{data.title}</h4>
      <p class="text-xs opacity-80 mt-0.5">{data.subtitle}</p>
    </div>
  </div>
{/if}
