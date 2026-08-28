<script lang="ts">
import { formatMxn } from '@sdk';

interface Props {
  open: boolean;
  jobCode: string;
  totalCents: number;
  onClose: () => void;
  onInvoiceGenerated?: (data: { rfc: string; uuid: string; pdfUrl: string; xmlUrl: string }) => void;
}

let {
  open,
  jobCode,
  totalCents,
  onClose,
  onInvoiceGenerated,
}: Props = $props();

let rfc = $state('GARM880415XYZ');
let razonSocial = $state('MARIANA GARZA LOZANO');
let postalCode = $state('11550');
let regimenFiscal = $state('612'); // Personas Físicas con Actividades Empresariales
let usoCfdi = $state('G03'); // Gastos en general

let isStamping = $state(false);
let stampedUuid = $state<string | null>(null);

function handleGenerateInvoice() {
  if (!rfc || rfc.length < 12) return;

  isStamping = true;
  setTimeout(() => {
    isStamping = false;
    const uuid = `YSF-${crypto.randomUUID().toUpperCase()}`;
    stampedUuid = uuid;
    onInvoiceGenerated?.({
      rfc: rfc.toUpperCase(),
      uuid,
      pdfUrl: '#',
      xmlUrl: '#',
    });
  }, 900);
}

function downloadMockFile(ext: 'pdf' | 'xml') {
  const content = ext === 'xml'
    ? `<?xml version="1.0" encoding="UTF-8"?><cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Folio="${jobCode}" Total="${(totalCents / 100).toFixed(2)}" UUID="${stampedUuid}"></cfdi:Comprobante>`
    : `YESSYFY CFDI 4.0 PDF - FOLIO ${jobCode} - UUID ${stampedUuid} - RFC ${rfc}`;
  const blob = new Blob([content], { type: ext === 'xml' ? 'application/xml' : 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `factura_${jobCode}_${rfc}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

{#if open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end" onclick={onClose}>
    <div
      class="bg-base-100 border-l border-base-300 w-full sm:max-w-md h-full flex flex-col shadow-2xl p-6 space-y-6 overflow-y-auto"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-base-300 pb-4">
        <div class="flex items-center gap-2">
          <div class="w-9 h-9 rounded-xl bg-accent text-accent-content font-black flex items-center justify-center text-sm shadow">
            SAT
          </div>
          <div>
            <h3 class="font-black text-base text-base-content">Facturación Electrónica (CFDI 4.0)</h3>
            <p class="text-[11px] text-base-content/60 font-mono">Orden #{jobCode} • {formatMxn(totalCents)}</p>
          </div>
        </div>
        <button type="button" class="btn btn-ghost btn-circle btn-sm" onclick={onClose}>✕</button>
      </div>

      {#if stampedUuid}
        <!-- Stamped Success View -->
        <div class="space-y-4 text-center py-4">
          <div class="w-16 h-16 rounded-full bg-success/20 text-success text-3xl font-black flex items-center justify-center mx-auto">
            ✓
          </div>
          <div class="space-y-1">
            <h4 class="font-black text-lg text-base-content">Factura Timbrada con Éxito</h4>
            <p class="text-xs text-base-content/70">Certificada ante el SAT con folio fiscal digital</p>
          </div>

          <div class="p-3 rounded-2xl bg-base-200 border border-base-300 text-left font-mono text-xs space-y-1">
            <div class="text-[10px] text-base-content/60 uppercase">Folio Fiscal (UUID):</div>
            <div class="text-primary font-bold break-all">{stampedUuid}</div>
            <div class="text-[10px] text-base-content/60 uppercase pt-2">RFC Receptor:</div>
            <div class="text-base-content font-bold">{rfc.toUpperCase()}</div>
          </div>

          <!-- Download Action Buttons -->
          <div class="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              class="btn btn-neutral btn-sm rounded-xl font-bold min-h-[48px]"
              onclick={() => downloadMockFile('xml')}
            >
              💾 Descargar XML
            </button>
            <button
              type="button"
              class="btn btn-primary btn-sm rounded-xl font-bold min-h-[48px]"
              onclick={() => downloadMockFile('pdf')}
            >
              📄 Descargar PDF
            </button>
          </div>
        </div>
      {:else}
        <!-- Form View -->
        <div class="space-y-4">
          <p class="text-xs text-base-content/70 leading-relaxed">
            Ingresa tus datos fiscales vigentes según tu Constancia de Situación Fiscal ante el SAT para timbrado inmediato.
          </p>

          <!-- RFC -->
          <div class="space-y-1">
            <label for="rfc-input" class="text-[11px] font-bold text-base-content/80 uppercase">RFC con Homoclave</label>
            <input
              id="rfc-input"
              type="text"
              maxlength="13"
              bind:value={rfc}
              class="input input-bordered input-sm w-full uppercase font-mono font-bold"
            />
          </div>

          <!-- Razón Social -->
          <div class="space-y-1">
            <label for="razon-input" class="text-[11px] font-bold text-base-content/80 uppercase">Nombre o Razón Social</label>
            <input
              id="razon-input"
              type="text"
              bind:value={razonSocial}
              class="input input-bordered input-sm w-full uppercase text-xs"
            />
          </div>

          <!-- C.P. Fiscal -->
          <div class="space-y-1">
            <label for="cp-input" class="text-[11px] font-bold text-base-content/80 uppercase">Código Postal Fiscal</label>
            <input
              id="cp-input"
              type="text"
              maxlength="5"
              bind:value={postalCode}
              class="input input-bordered input-sm w-full font-mono text-xs"
            />
          </div>

          <!-- Régimen Fiscal -->
          <div class="space-y-1">
            <label for="regimen-input" class="text-[11px] font-bold text-base-content/80 uppercase">Régimen Fiscal SAT</label>
            <select id="regimen-input" bind:value={regimenFiscal} class="select select-bordered select-sm w-full text-xs">
              <option value="605">605 - Sueldos y Salarios</option>
              <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
              <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
              <option value="601">601 - General de Ley Personas Morales</option>
            </select>
          </div>

          <!-- Uso CFDI -->
          <div class="space-y-1">
            <label for="uso-input" class="text-[11px] font-bold text-base-content/80 uppercase">Uso de CFDI</label>
            <select id="uso-input" bind:value={usoCfdi} class="select select-bordered select-sm w-full text-xs">
              <option value="G03">G03 - Gastos en general</option>
              <option value="D01">D01 - Honorarios médicos</option>
              <option value="S01">S01 - Sin efectos fiscales</option>
            </select>
          </div>

          <button
            type="button"
            class="btn btn-primary btn-block rounded-2xl font-bold min-h-[52px] text-sm shadow-md"
            disabled={isStamping}
            onclick={handleGenerateInvoice}
          >
            {#if isStamping}
              <span class="loading loading-spinner loading-sm"></span>
              <span>Timbrando ante PAC SAT...</span>
            {:else}
              <span>Generar Factura CFDI 4.0 Inmediata</span>
            {/if}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}
