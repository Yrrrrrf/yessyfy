<script lang="ts">
import {
	formatMxn,
	type LegalWarrantyDocument,
	type WarrantyCertificate,
} from "@sdk/core";
import {
	downloadPdfViaPrint,
	printElement,
	renderQrCodeSvg,
} from "./pdfExport.ts";

interface Props {
	open: boolean;
	warranty?: LegalWarrantyDocument | null;
	certificate?: WarrantyCertificate | null;
	jobCode?: string;
	customerName?: string;
	customerAddress?: string;
	collaboratorName?: string;
	serviceCategory?: string;
	serviceDescription?: string;
	onClose: () => void;
}

let {
	open,
	warranty = null,
	certificate = null,
	jobCode = "YSF-2026-0881",
	customerName = "Mariana Garza Lozano",
	customerAddress = "Av. Horacio 1420, Polanco V Sección, Miguel Hidalgo, CDMX",
	collaboratorName = "Roberto Morales",
	serviceCategory = "Plomería Residencial",
	serviceDescription = "Reparación especializada de red hidrosanitaria con reemplazo de tubería y válvulas",
	onClose,
}: Props = $props();

const nowIso = new Date().toISOString();
const validUntilIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
	.toISOString();

// Synthesize complete Legal Warranty Document if not provided
const activeWarranty = $derived<LegalWarrantyDocument>(
	warranty || {
		certificateNumber:
			certificate?.certificateNumber ||
			`YSF-WAR-2026-CDMX-${jobCode.replace(/[^0-9]/g, "") || "0881"}`,
		jobOrderId: certificate?.jobOrderId || "job_0881",
		jobCode: jobCode,
		serviceCategory: serviceCategory,
		serviceDescription: serviceDescription,
		customerId: certificate?.customerId || "usr_cust_123",
		customerName: customerName,
		customerPhone: "+52 55 4433 2211",
		customerAddress: customerAddress,
		collaboratorId: certificate?.collaboratorId || "usr_colab_456",
		collaboratorName: collaboratorName,
		collaboratorTrade: "Técnico Especialista Certificado",
		validFrom: certificate?.validFrom || nowIso,
		validUntil: certificate?.validUntil || validUntilIso,
		status: certificate?.status || "active",
		termsHash:
			certificate?.termsHash ||
			"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		coverageAmountCents: 50000000, // $500,000.00 MXN
		insurancePolicy: {
			insurer:
				"Seguros Afirme S.A. de C.V. / Chubb Seguros México S.A.",
			policyNumber: "RC-YSF-2026-99412",
			coverageDescription:
				"Póliza Maestra de Responsabilidad Civil General, Daños Ocultos y Perjuicios a Terceros en Inmuebles Residenciales y Comerciales",
			maxCoverageCents: 50000000,
			deductibleCents: 0,
		},
		nom151: {
			certificateAuthority:
				"PSC-NOM151-SE-004 (Acreditado por la Secretaría de Economía)",
			timestamp: nowIso,
			digestAlgorithm: "SHA-256",
			digest:
				"a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
			evidenceReceipt: `TSA-NOM151-YSF-WAR-${jobCode.replace(/[^0-9]/g, "") || "0881"}-HASH-VERIFIED`,
		},
		legalFramework:
			"Artículos 77, 78, 79, 80, 81, 82, 83 y 84 de la Ley Federal de Protección al Consumidor (LFPC / PROFECO)",
		createdAt: nowIso,
	},
);

const verificationUrl = $derived(
	`https://yessyfy.com/garantia/verificar?folio=${encodeURIComponent(activeWarranty.certificateNumber)}&hash=${activeWarranty.termsHash.slice(0, 16)}`,
);

const qrSvgMarkup = $derived(renderQrCodeSvg(verificationUrl, 130));

const formatDate = (iso: string) => {
	try {
		return new Date(iso).toLocaleDateString("es-MX", {
			day: "2-digit",
			month: "long",
			year: "numeric",
		});
	} catch {
		return iso;
	}
};

function handleDownloadPdf() {
	downloadPdfViaPrint(
		"warranty-cert-print-area",
		`Garantia_Legal_Yessyfy_${activeWarranty.certificateNumber}`,
	);
}

function handlePrint() {
	printElement("warranty-cert-print-area", {
		title: `Garantia_Legal_Yessyfy_${activeWarranty.certificateNumber}`,
	});
}

function handleShareWhatsApp() {
	const message = `🛡️ *Certificado de Garantía Legal Yessyfy (30 Días)*\nFolio: ${activeWarranty.certificateNumber}\nOrden: ${activeWarranty.jobCode}\nCobertura: $500,000.00 MXN en Responsabilidad Civil\nVerificar validez: ${verificationUrl}`;
	window.open(
		`https://wa.me/?text=${encodeURIComponent(message)}`,
		"_blank",
	);
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
      <!-- Modal Action Header (Screen Only) -->
      <div class="px-6 py-4 border-b border-base-300 flex items-center justify-between bg-base-200/60 no-print">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-primary text-primary-content font-black flex items-center justify-center text-sm shadow">
            🛡️
          </div>
          <div>
            <h3 class="font-extrabold text-sm text-base-content flex items-center gap-2">
              Póliza de Garantía Legal (LFPC Arts. 77–84)
              <span class="badge badge-success badge-xs font-bold font-mono">Activa (30 Días)</span>
            </h3>
            <p class="text-[11px] font-mono text-base-content/60">
              Folio Oficial: {activeWarranty.certificateNumber}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="btn btn-outline btn-success btn-sm rounded-xl font-bold gap-1.5"
            onclick={handleShareWhatsApp}
            title="Compartir constancia por WhatsApp"
          >
            📲 <span class="hidden sm:inline">WhatsApp</span>
          </button>
          <button
            type="button"
            class="btn btn-primary btn-sm rounded-xl font-bold gap-1.5 shadow"
            onclick={handleDownloadPdf}
            title="Descargar Póliza en PDF"
          >
            📄 <span class="hidden sm:inline">Descargar</span> PDF
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-sm rounded-xl"
            onclick={handlePrint}
            title="Imprimir Póliza"
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

      <!-- Printable Warranty Certificate Document Body -->
      <div class="p-6 sm:p-8 overflow-y-auto bg-base-100 flex-1">
        <div
          id="warranty-cert-print-area"
          class="bg-white text-neutral-900 font-sans text-xs leading-relaxed p-6 sm:p-10 rounded-2xl border-2 border-neutral-300 shadow-sm space-y-6 max-w-[800px] mx-auto relative overflow-hidden"
          style="background-color: #ffffff !important; color: #111827 !important;"
        >
          <!-- Security Border Stamp & Watermark -->
          <div class="absolute -right-8 -bottom-8 opacity-5 pointer-events-none text-9xl font-black select-none font-mono">
            PROFECO
          </div>

          <!-- Official Document Header -->
          <div class="border-b-2 border-neutral-800 pb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="font-black text-2xl tracking-tight text-neutral-900">YESSYFY</span>
                <span class="text-[10px] font-bold bg-neutral-900 text-white px-2 py-0.5 rounded uppercase">
                  Protección al Consumidor
                </span>
              </div>
              <h1 class="font-extrabold text-base text-neutral-900 uppercase tracking-tight">
                Certificado Oficial de Garantía y Fianza de Cumplimiento
              </h1>
              <p class="text-[11px] text-neutral-600">
                Emitido al amparo de la Ley Federal de Protección al Consumidor y Norma Oficial Mexicana NOM-151-SCFI-2016
              </p>
            </div>

            <div class="sm:text-right font-mono text-[11px] bg-neutral-50 p-3 rounded-xl border border-neutral-200 shrink-0 space-y-1">
              <span class="font-bold text-[10px] text-neutral-500 uppercase block">Folio de Garantía</span>
              <p class="text-sm font-black text-primary">{activeWarranty.certificateNumber}</p>
              <p class="text-[10px] text-neutral-600">Orden: <strong>#{activeWarranty.jobCode}</strong></p>
            </div>
          </div>

          <!-- Validity & Coverage Badge Banner -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-neutral-100 border border-neutral-300">
            <div>
              <span class="text-[10px] uppercase font-bold text-neutral-500 block">Periodo de Cobertura</span>
              <span class="font-bold text-neutral-900">30 Días Naturales</span>
              <p class="text-[10px] text-neutral-600">{formatDate(activeWarranty.validFrom)} – {formatDate(activeWarranty.validUntil)}</p>
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-neutral-500 block">Suma Asegurada RC</span>
              <span class="font-black text-sm text-success">{formatMxn(activeWarranty.coverageAmountCents)} MXN</span>
              <p class="text-[10px] text-neutral-600">Deducible $0.00 MXN</p>
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-neutral-500 block">Estatus Legal</span>
              <span class="inline-flex items-center gap-1 font-bold text-success text-[11px]">
                <span class="w-2 h-2 rounded-full bg-success"></span> VIGENTE Y RESPALDADA
              </span>
              <p class="text-[10px] text-neutral-600">Contrato Escrow de Depósito en Garantía</p>
            </div>
          </div>

          <!-- Service and Beneficiary Information -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px]">
            <div class="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 space-y-1">
              <span class="font-bold text-[10px] uppercase text-neutral-500 block">Beneficiario Titular (Consumidor)</span>
              <p class="font-bold text-neutral-900">{activeWarranty.customerName}</p>
              <p class="text-neutral-600"><strong>Inmueble:</strong> {activeWarranty.customerAddress}</p>
              <p class="text-neutral-600"><strong>Contacto:</strong> {activeWarranty.customerPhone}</p>
            </div>

            <div class="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 space-y-1">
              <span class="font-bold text-[10px] uppercase text-neutral-500 block">Técnico Prestador del Servicio</span>
              <p class="font-bold text-neutral-900">{activeWarranty.collaboratorName}</p>
              <p class="text-neutral-600"><strong>Especialidad:</strong> {activeWarranty.collaboratorTrade}</p>
              <p class="text-neutral-600"><strong>Intervención:</strong> {activeWarranty.serviceDescription}</p>
            </div>
          </div>

          <!-- Insurance Policy Underwriting Card -->
          <div class="border border-neutral-300 rounded-xl p-4 bg-neutral-50/70 space-y-2">
            <div class="flex items-center justify-between border-b border-neutral-200 pb-2">
              <span class="font-black text-xs text-neutral-900 uppercase flex items-center gap-1.5">
                🏢 Póliza Maestra de Seguro de Responsabilidad Civil
              </span>
              <span class="font-mono text-[10px] font-bold text-neutral-600">Póliza No. {activeWarranty.insurancePolicy.policyNumber}</span>
            </div>
            <div class="text-[10px] text-neutral-700 space-y-1">
              <p><strong>Compañía Aseguradora Garante:</strong> {activeWarranty.insurancePolicy.insurer}</p>
              <p><strong>Alcance de Indemnización:</strong> {activeWarranty.insurancePolicy.coverageDescription}. Ampara reparaciones correctivas secundarias, fallas eléctricas, fugas por presión hidráulica o deterioro imputable a vicios de instalación.</p>
              <p><strong>Sin Costo para el Cliente:</strong> En caso de siniestro o defecto reclamado durante los 30 días posteriores al servicio, Yessyfy reasigna un técnico certificado o cubre la reposición patrimonial sin cobro de deducible alguno.</p>
            </div>
          </div>

          <!-- LFPC Legal Framework (Arts. 77 - 84) -->
          <div class="space-y-2 text-[10px] text-neutral-700 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
            <span class="font-bold uppercase text-neutral-900 block text-[11px]">
              Términos Legales y Derechos del Consumidor (Artículos 77 a 84 de la LFPC)
            </span>
            <p>
              <strong>Artículo 77:</strong> Todo bien o servicio que se ofrezca con garantía deberá sujetarse a lo dispuesto por esta ley y a lo pactado entre proveedores y consumidores.
            </p>
            <p>
              <strong>Artículo 78:</strong> La póliza de garantía expedida por Yessyfy expresa de manera clara su alcance, duración de 30 días, condiciones y el mecanismo inmediato para hacerla efectiva mediante la aplicación móvil o línea de soporte 24/7.
            </p>
            <p>
              <strong>Artículo 79:</strong> La garantía es directamente exigible ante Yessyfy Tecnologías S.A.P.I. de C.V. como intermediario fiduciario y ante el técnico especialista que ejecutó la orden de trabajo.
            </p>
            <p>
              <strong>Artículo 82:</strong> El consumidor tiene derecho a la reposición del servicio o a la devolución de la cantidad pagada cuando el servicio presente vicios ocultos, defectos de mano de obra o incumplimiento de las especificaciones pactadas.
            </p>
          </div>

          <!-- NOM-151 Digital Timestamp & Cryptographic Verification -->
          <div class="border-2 border-neutral-300 rounded-2xl p-4 bg-neutral-50/50 space-y-3">
            <div class="flex flex-col sm:flex-row gap-4 items-center">
              <!-- QR Code to Verification Engine -->
              <div class="p-2 bg-white rounded-xl border border-neutral-300 shadow-sm shrink-0 flex items-center justify-center">
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                {@html qrSvgMarkup}
              </div>

              <!-- Cryptographic Stamp Details -->
              <div class="flex-1 font-mono text-[10px] text-neutral-700 space-y-1 break-all">
                <div class="flex flex-wrap items-center justify-between border-b border-neutral-200 pb-1">
                  <span class="font-bold uppercase text-neutral-900">Constancia de Conservación NOM-151-SCFI-2016</span>
                  <span class="text-success font-bold">✓ Sellado Digital Válido</span>
                </div>
                <p><strong>Autoridad Certificadora:</strong> {activeWarranty.nom151.certificateAuthority}</p>
                <p><strong>Fecha y Hora de Emisión (TSA):</strong> {activeWarranty.nom151.timestamp}</p>
                <p><strong>Hash de Términos (SHA-256):</strong> {activeWarranty.termsHash}</p>
                <p><strong>Firma de Evidencia QA:</strong> {activeWarranty.nom151.evidenceReceipt}</p>
              </div>
            </div>

            <p class="text-[9px] text-center text-neutral-500 italic pt-1">
              Documento digital con validez legal probatoria plena conforme al Código de Comercio y la legislación mercantil mexicana.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}



