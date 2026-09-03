<script lang="ts">
import { BeforeAfterSlider, InAppChatDrawer } from '@sdk/ui';
import { visionStore } from '../visionStore.svelte.ts';

let isApproved = $state(false);
let isFrozen = $state(false);
let isChatOpen = $state(false);
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-xl font-black text-base-content tracking-tight">Auditoría Fotográfica de Garantía (QA Pericial)</h2>
    <p class="text-xs text-base-content/70">
      Comparativa obligatoria Antes vs. Después. Verificación de sellado y evidencia con marca de agua y hash criptográfico SHA-256.
    </p>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
    <div class="space-y-3">
      <span class="text-xs font-bold uppercase tracking-wider text-base-content/60">Inspección Deslizante en Sitio</span>
      <BeforeAfterSlider
        beforeUrl="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800"
        afterUrl="https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800"
        beforeLabel="Diagnóstico Inicial"
        afterLabel="Reparación Finalizada"
      />
    </div>

    <div class="card bg-base-200 border border-base-300 rounded-3xl p-6 space-y-6">
      <div>
        <span class="badge badge-warning badge-sm font-mono">YSF-2026-0102</span>
        <h3 class="text-lg font-black text-base-content mt-1">Dictamen Pericial de Calidad</h3>
        <p class="text-xs text-base-content/70 mt-0.5">
          Profesional Independiente: Ignacio Fuentes Silva • Coyoacán Centro
        </p>
      </div>

      <div class="space-y-2 text-xs">
        <div class="flex justify-between p-2.5 rounded-xl bg-base-100 border border-base-300">
          <span class="text-base-content/70">Marca de Agua GPS:</span>
          <span class="font-mono font-semibold text-success">19.3621° N, -99.1687° W (Geocerca OK)</span>
        </div>
        <div class="flex justify-between p-2.5 rounded-xl bg-base-100 border border-base-300">
          <span class="text-base-content/70">Integridad Criptográfica:</span>
          <span class="font-mono text-accent">SHA-256: e89b...33fa [Válido]</span>
        </div>
      </div>

      {#if isApproved}
        <div class="alert alert-success text-xs font-bold">
          ✓ QA Aprobado exitosamente. Fondos en Escrow liberados al colaborador.
        </div>
      {:else if isFrozen}
        <div class="alert alert-error text-xs font-bold">
          🚨 QA Rechazado. Fondos en Escrow congelados para arbitraje de operaciones.
        </div>
      {/if}

      <div class="grid grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          class="btn btn-error btn-outline btn-sm font-bold min-h-[48px]"
          onclick={() => {
            visionStore.freezeEscrow('ord_102');
            isFrozen = true;
            isApproved = false;
          }}
        >
          Rechazar QA & Congelar
        </button>
        <button
          type="button"
          class="btn btn-success btn-sm font-bold min-h-[48px]"
          onclick={() => {
            visionStore.approveTicket('ord_102');
            isApproved = true;
            isFrozen = false;
          }}
        >
          Aprobar QA & Liberar Escrow
        </button>
      </div>

      <div class="pt-2 border-t border-base-300">
        <button
          type="button"
          class="btn btn-outline btn-sm w-full font-bold rounded-2xl flex items-center justify-center gap-2"
          onclick={() => (isChatOpen = true)}
        >
          <span>💬</span>
          <span>Auditar Historial de Chat Seguro</span>
        </button>
      </div>
    </div>
  </div>
</div>

<InAppChatDrawer
  open={isChatOpen}
  jobCode="YSF-2026-0102"
  peerName="Ignacio Fuentes (Técnico) & Carlos Slim (Cliente)"
  peerRole="operations"
  currentUserRole="operations"
  onClose={() => (isChatOpen = false)}
/>
