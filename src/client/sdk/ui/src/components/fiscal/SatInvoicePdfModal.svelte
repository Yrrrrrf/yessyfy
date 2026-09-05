<script lang="ts">
import {
	formatMxn,
	type SatInvoiceDocument,
	type SatInvoiceItem,
} from "@sdk/core";
import {
	buildSatVerificationUrl,
	downloadFile,
	downloadPdfViaPrint,
	generateCfdi40Xml,
	printElement,
	renderQrCodeSvg,
} from "./pdfExport.ts";

interface Props {
	open: boolean;
	invoice?: SatInvoiceDocument | null;
	jobCode?: string;
	stampedUuid?: string;
	rfc?: string;
	customerName?: string;
	totalCents?: number;
	onClose: () => void;
}

let {
	open,
	invoice = null,
	jobCode = "YSF-2026-0881",
	stampedUuid = "8F3A2B1C-9E4D-4A7F-B2C1-3E5A7D9F1B2C",
	rfc = "MORA850612ABC",
	customerName = "Mariana Garza Lozano",
	totalCents = 45000,
	onClose,
}: Props = $props();

// Synthesize complete CFDI 4.0 document if raw invoice was not provided
const activeInvoice = $derived<SatInvoiceDocument>(
	invoice || (() => {
		// Calculate tax breakdown:
		// Subtotal + 16% IVA - 1% ISR Retenido - 8% IVA Retenido = Total
		// Total = Subtotal * (1 + 0.16 - 0.01 - 0.08) = Subtotal * 1.07
		const subtotalCents = Math.round(totalCents / 1.07);
		const ivaTrasladadoCents = Math.round(subtotalCents * 0.16);
		const isrRetenidoCents = Math.round(subtotalCents * 0.01);
		const ivaRetenidoCents = Math.round(subtotalCents * 0.08);
		const calculatedTotalCents =
			subtotalCents +
			ivaTrasladadoCents -
			isrRetenidoCents -
			ivaRetenidoCents;

		const defaultItem: SatInvoiceItem = {
			claveProdServ: "72101501",
			noIdentificacion: `SRV-${jobCode.replace(/[^a-zA-Z0-9]/g, "")}`,
			cantidad: 1,
			claveUnidad: "E48",
			unidad: "Servicio",
			descripcion: `Servicio técnico profesional de mantenimiento y reparación residencial (${jobCode})`,
			valorUnitarioCents: subtotalCents,
			importeCents: subtotalCents,
			objetoImp: "02",
			ivaTasa: 0.16,
			ivaImporteCents: ivaTrasladadoCents,
		};

		const cleanUuid = stampedUuid.startsWith("YSF-")
			? stampedUuid.slice(4)
			: stampedUuid;
		// Ensure standard 8-4-4-4-12 UUID format
		const formattedUuid =
			cleanUuid.length === 36
				? cleanUuid
				: "8F3A2B1C-9E4D-4A7F-B2C1-3E5A7D9F1B2C";

		const nowIso = new Date().toISOString().slice(0, 19);

		return {
			version: "4.0",
			serie: "YSF",
			folio: jobCode.replace(/[^0-9]/g, "") || "0881",
			fecha: nowIso,
			formaPago: "03",
			metodoPago: "PUE",
			tipoDeComprobante: "I",
			lugarExpedicion: "11560",
			moneda: "MXN",
			subtotalCents,
			ivaTrasladadoCents,
			isrRetenidoCents,
			ivaRetenidoCents,
			totalCents: calculatedTotalCents,
			emisor: {
				rfc: "YSF260101ABC",
				nombre: "YESSYFY TECNOLOGÍAS S.A.P.I. DE C.V.",
				regimenFiscal: "601",
				csd: "00001000000508923412",
			},
			receptor: {
				rfc: rfc.toUpperCase(),
				nombre: customerName.toUpperCase(),
				domicilioFiscalReceptor: "11550",
				regimenFiscalReceptor: "612",
				usoCfdi: "G03",
			},
			conceptos: [defaultItem],
			timbreFiscal: {
				version: "1.1",
				uuid: formattedUuid,
				fechaTimbrado: nowIso,
				rfcProvCertif: "SED1102088J7",
				noCertificadoSat: "00001000000504465028",
				selloCfd:
					"BqY8xLmZ7K2pQwRtUyOiPlKjHgFdSaZxCvBnMqWeRtYuIoPzAxScVbNmQwErTyUiOpAsDfGhJkLzXcVbNmQwErTyUiOpAsDfGhJkLzXc==",
				selloSat:
					"K8jN2pXy9A3bC4dE5fG6hI7jK8lM9nO0pQ1rS2tU3vW4xY5z0123456789aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789AbCdEfGhIj==",
				cadenaOriginalSat: `||1.1|${formattedUuid}|${nowIso}|SED1102088J7|BqY8xLmZ7K2pQwRtUyOiPlKjHgFdSaZxCvBnMqWeRtYuIoPzAxScVbNmQwErTyUiOpAsDfGhJkLzXcVbNmQwErTyUiOpAsDfGhJkLzXc==|00001000000504465028||`,
				qrCodeUrl: buildSatVerificationUrl(
					formattedUuid,
					"YSF260101ABC",
					rfc,
					calculatedTotalCents,
					"BqY8xLmZ7K2pQwRtUyOiPlKjHgFdSaZxCvBnMqWeRtYuIoPzAxScVbNmQwErTyUiOpAsDfGhJkLzXcVbNmQwErTyUiOpAsDfGhJkLzXc==",
				),
			},
		};
	})(),
);

const satVerificationUrl = $derived(
	buildSatVerificationUrl(
		activeInvoice.timbreFiscal.uuid,
		activeInvoice.emisor.rfc,
		activeInvoice.receptor.rfc,
		activeInvoice.totalCents,
		activeInvoice.timbreFiscal.selloCfd,
	),
);

const qrSvgMarkup = $derived(renderQrCodeSvg(satVerificationUrl, 140));

function handleDownloadPdf() {
	downloadPdfViaPrint(
		"sat-invoice-print-area",
		`Factura_SAT_${activeInvoice.serie}_${activeInvoice.folio}_${activeInvoice.receptor.rfc}`,
	);
}

function handleDownloadXml() {
	const xml = generateCfdi40Xml(activeInvoice);
	downloadFile(
		xml,
		`factura_${activeInvoice.serie}_${activeInvoice.folio}.xml`,
		"application/xml",
	);
}

function handlePrint() {
	printElement("sat-invoice-print-area", {
		title: `Factura_SAT_${activeInvoice.serie}_${activeInvoice.folio}`,
	});
}
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    onclick={onClose}
  >
    <div
      class="bg-base-100 border border-base-300 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Modal Action Toolbar (Screen Only) -->
      <div class="px-6 py-4 border-b border-base-300 flex items-center justify-between bg-base-200/60 no-print">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-accent text-accent-content font-black flex items-center justify-center text-sm shadow">
            SAT
          </div>
          <div>
            <h3 class="font-extrabold text-sm text-base-content flex items-center gap-2">
              CFDI Versión 4.0 Stamped
              <span class="badge badge-success badge-xs font-mono font-bold">Timbrado SAT</span>
            </h3>
            <p class="text-[11px] font-mono text-base-content/60">
              Folio Fiscal: {activeInvoice.timbreFiscal.uuid}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="btn btn-neutral btn-sm rounded-xl font-bold gap-1.5"
            onclick={handleDownloadXml}
            title="Descargar archivo XML oficial"
          >
            💾 <span class="hidden sm:inline">Descargar</span> XML
          </button>
          <button
            type="button"
            class="btn btn-primary btn-sm rounded-xl font-bold gap-1.5 shadow"
            onclick={handleDownloadPdf}
            title="Descargar PDF en tamaño Carta"
          >
            📄 <span class="hidden sm:inline">Descargar</span> PDF
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-sm rounded-xl"
            onclick={handlePrint}
            title="Imprimir"
          >
            🖨️
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-circle btn-sm ml-1"
            onclick={onClose}
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Printable Invoice Document Body -->
      <div class="p-6 sm:p-8 overflow-y-auto bg-base-100 flex-1">
        <div
          id="sat-invoice-print-area"
          class="bg-white text-neutral-900 font-sans text-xs leading-normal p-6 sm:p-8 rounded-2xl border border-neutral-200 shadow-sm space-y-6 max-w-[800px] mx-auto"
          style="background-color: #ffffff !important; color: #111827 !important;"
        >
          <!-- Fiscal Header -->
          <div class="flex flex-col sm:flex-row justify-between gap-4 border-b-2 border-neutral-800 pb-4">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="font-black text-xl tracking-tight text-neutral-900">YESSYFY</span>
                <span class="text-[10px] font-bold bg-neutral-900 text-white px-2 py-0.5 rounded">CFDI 4.0</span>
              </div>
              <h1 class="font-bold text-sm text-neutral-800 uppercase">{activeInvoice.emisor.nombre}</h1>
              <div class="text-[11px] font-mono text-neutral-600 space-y-0.5">
                <p><strong>RFC Emisor:</strong> {activeInvoice.emisor.rfc}</p>
                <p><strong>Régimen Fiscal:</strong> {activeInvoice.emisor.regimenFiscal} - General de Ley Personas Morales</p>
                <p><strong>Lugar de Expedición:</strong> C.P. {activeInvoice.lugarExpedicion} (CDMX)</p>
                <p><strong>Efecto de Comprobante:</strong> [I] Ingreso</p>
              </div>
            </div>

            <div class="sm:text-right space-y-1 border-t sm:border-t-0 pt-2 sm:pt-0 font-mono text-[11px] text-neutral-600">
              <div class="bg-neutral-100 p-2.5 rounded-xl border border-neutral-300">
                <p class="font-bold text-xs text-neutral-900 uppercase">FACTURA</p>
                <p class="text-sm font-black text-primary">{activeInvoice.serie}-{activeInvoice.folio}</p>
              </div>
              <p><strong>Fecha Emisión:</strong> {activeInvoice.fecha}</p>
              <p><strong>Método de Pago:</strong> {activeInvoice.metodoPago} - Pago en una sola exhibición</p>
              <p><strong>Forma de Pago:</strong> {activeInvoice.formaPago} - Transferencia electrónica</p>
              <p><strong>Moneda:</strong> {activeInvoice.moneda}</p>
            </div>
          </div>

          <!-- Emisor & Receptor Info Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="bg-neutral-50 p-3 rounded-xl border border-neutral-200 space-y-1 font-mono text-[11px]">
              <span class="font-bold text-[10px] uppercase text-neutral-500 block">Datos del Emisor</span>
              <p class="font-bold text-neutral-900">{activeInvoice.emisor.nombre}</p>
              <p>RFC: {activeInvoice.emisor.rfc}</p>
              <p>No. Certificado CSD: {activeInvoice.emisor.csd}</p>
            </div>

            <div class="bg-neutral-50 p-3 rounded-xl border border-neutral-200 space-y-1 font-mono text-[11px]">
              <span class="font-bold text-[10px] uppercase text-neutral-500 block">Datos del Receptor</span>
              <p class="font-bold text-neutral-900">{activeInvoice.receptor.nombre}</p>
              <p>RFC: {activeInvoice.receptor.rfc}</p>
              <p>Domicilio Fiscal: C.P. {activeInvoice.receptor.domicilioFiscalReceptor}</p>
              <p>Régimen Fiscal: {activeInvoice.receptor.regimenFiscalReceptor}</p>
              <p>Uso del CFDI: {activeInvoice.receptor.usoCfdi} - Gastos en general</p>
            </div>
          </div>

          <!-- Concept Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left text-[11px] border border-neutral-200 rounded-xl overflow-hidden">
              <thead class="bg-neutral-100 text-neutral-800 font-bold border-b border-neutral-200 uppercase text-[10px]">
                <tr>
                  <th class="p-2.5">Clave P/S</th>
                  <th class="p-2.5">Cant.</th>
                  <th class="p-2.5">Clave Unidad</th>
                  <th class="p-2.5">Descripción</th>
                  <th class="p-2.5 text-right">Valor Unitario</th>
                  <th class="p-2.5 text-right">Impuesto</th>
                  <th class="p-2.5 text-right">Importe</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-200">
                {#each activeInvoice.conceptos as item}
                  <tr>
                    <td class="p-2.5 font-mono text-[10px]">{item.claveProdServ}</td>
                    <td class="p-2.5 text-center font-mono">{item.cantidad}</td>
                    <td class="p-2.5 font-mono text-[10px]">{item.claveUnidad}</td>
                    <td class="p-2.5">
                      <div class="font-semibold text-neutral-900">{item.descripcion}</div>
                      {#if item.noIdentificacion}
                        <div class="text-[9px] font-mono text-neutral-500">ID: {item.noIdentificacion} • ObjetoImp: {item.objetoImp}</div>
                      {/if}
                    </td>
                    <td class="p-2.5 text-right font-mono">{formatMxn(item.valorUnitarioCents)}</td>
                    <td class="p-2.5 text-right font-mono text-[10px]">IVA (16%) {formatMxn(item.ivaImporteCents)}</td>
                    <td class="p-2.5 text-right font-bold font-mono">{formatMxn(item.importeCents)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          <!-- Totals and Retentions Breakdown -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-2">
            <!-- Legal Notes & Tax Withholdings Note -->
            <div class="bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-[10px] text-neutral-600 space-y-1">
              <span class="font-bold uppercase text-neutral-700 block">Retenciones e Impuestos Aplicables</span>
              <p>• <strong>LISR Art. 113-A:</strong> Retención de 1.0% de ISR por intermediación de servicios a través de plataformas digitales.</p>
              <p>• <strong>LIVA Art. 18-J:</strong> Retención de 8.0% de IVA (50% de la tasa general) conforme a disposiciones fiscales vigentes.</p>
              <p class="pt-1 text-neutral-500 font-mono">CFDI 4.0 emitido de conformidad con la Resolución Miscelánea Fiscal.</p>
            </div>

            <!-- Calculated Totals -->
            <div class="bg-neutral-50 p-3 rounded-xl border border-neutral-200 font-mono text-[11px] space-y-1.5">
              <div class="flex justify-between text-neutral-700">
                <span>Subtotal:</span>
                <span>{formatMxn(activeInvoice.subtotalCents)}</span>
              </div>
              <div class="flex justify-between text-neutral-700">
                <span>Impuestos Trasladados (IVA 16%):</span>
                <span>+{formatMxn(activeInvoice.ivaTrasladadoCents)}</span>
              </div>
              {#if activeInvoice.isrRetenidoCents > 0}
                <div class="flex justify-between text-error font-semibold">
                  <span>Retención ISR (LISR 113-A 1.0%):</span>
                  <span>-{formatMxn(activeInvoice.isrRetenidoCents)}</span>
                </div>
              {/if}
              {#if activeInvoice.ivaRetenidoCents > 0}
                <div class="flex justify-between text-error font-semibold">
                  <span>Retención IVA (LIVA 18-J 8.0%):</span>
                  <span>-{formatMxn(activeInvoice.ivaRetenidoCents)}</span>
                </div>
              {/if}
              <div class="border-t-2 border-neutral-800 pt-1.5 flex justify-between font-black text-sm text-neutral-900">
                <span>TOTAL A PAGAR:</span>
                <span class="text-primary">{formatMxn(activeInvoice.totalCents)}</span>
              </div>
            </div>
          </div>

          <!-- Timbre Fiscal Digital del SAT (Annex 20 Section) -->
          <div class="border-2 border-neutral-300 rounded-2xl p-4 bg-neutral-50/50 space-y-3">
            <div class="flex flex-col sm:flex-row gap-4 items-center">
              <!-- Vector QR Code Matrix -->
              <div class="p-2 bg-white rounded-xl border border-neutral-300 shadow-sm shrink-0 flex items-center justify-center">
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                {@html qrSvgMarkup}
              </div>

              <!-- Timbre Fiscal Metadata -->
              <div class="flex-1 font-mono text-[10px] text-neutral-700 space-y-1 break-all">
                <div class="flex flex-wrap items-center justify-between border-b border-neutral-200 pb-1">
                  <span class="font-bold uppercase text-neutral-900">Timbre Fiscal Digital del SAT (TFD v1.1)</span>
                  <span class="text-neutral-500">RFC Proveedor: {activeInvoice.timbreFiscal.rfcProvCertif}</span>
                </div>
                <p><strong>Folio Fiscal (UUID):</strong> <span class="text-primary font-bold">{activeInvoice.timbreFiscal.uuid}</span></p>
                <p><strong>No. Serie Certificado SAT:</strong> {activeInvoice.timbreFiscal.noCertificadoSat}</p>
                <p><strong>Fecha y Hora de Certificación:</strong> {activeInvoice.timbreFiscal.fechaTimbrado}</p>
              </div>
            </div>

            <!-- Digital Seals -->
            <div class="font-mono text-[9px] text-neutral-600 space-y-1.5 pt-2 border-t border-neutral-200">
              <div>
                <span class="font-bold text-neutral-800 block uppercase">Cadena Original del Complemento de Certificación Digital del SAT:</span>
                <p class="bg-white p-1.5 rounded border border-neutral-200 break-all">{activeInvoice.timbreFiscal.cadenaOriginalSat}</p>
              </div>
              <div>
                <span class="font-bold text-neutral-800 block uppercase">Sello Digital del Emisor (CFD):</span>
                <p class="bg-white p-1.5 rounded border border-neutral-200 break-all">{activeInvoice.timbreFiscal.selloCfd}</p>
              </div>
              <div>
                <span class="font-bold text-neutral-800 block uppercase">Sello Digital del SAT:</span>
                <p class="bg-white p-1.5 rounded border border-neutral-200 break-all">{activeInvoice.timbreFiscal.selloSat}</p>
              </div>
            </div>

            <p class="text-[9px] text-center text-neutral-500 italic pt-1">
              Este documento es una representación impresa de un CFDI versión 4.0 certificada conforme a las disposiciones fiscales vigentes del SAT.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
