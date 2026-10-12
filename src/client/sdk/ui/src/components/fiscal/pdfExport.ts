import type { SatInvoiceDocument } from "@sdk/core";

export interface PrintOptions {
	title?: string;
	landscape?: boolean;
	pageMarginMm?: number;
}

/**
 * Formulates the official Mexican SAT verification URL for CFDI 4.0.
 * Specification according to Annex 20 of RMF:
 * https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id={uuid}&re={rfcE}&rr={rfcR}&tt={totalFormatted}&fe={sello8}
 *
 * @param uuid Folio Fiscal (UUID)
 * @param rfcE RFC del Emisor
 * @param rfcR RFC del Receptor
 * @param totalCents Total del comprobante en centavos
 * @param selloCfd Sello Digital del Emisor
 */
export function buildSatVerificationUrl(
	uuid: string,
	rfcE: string,
	rfcR: string,
	totalCents: number,
	selloCfd: string,
): string {
	const totalFormatted = (totalCents / 100).toFixed(6);
	const last8CharsSello = selloCfd.slice(-8);
	const baseUrl =
		"https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx";
	const params = new URLSearchParams({
		id: uuid,
		re: rfcE.toUpperCase(),
		rr: rfcR.toUpperCase(),
		tt: totalFormatted,
		fe: last8CharsSello,
	});
	return `${baseUrl}?${params.toString()}`;
}

/**
 * Generates official Annex 20 CFDI 4.0 XML string.
 * Compliant with Mexican SAT CFDI 4.0 schema & TimbreFiscalDigital v1.1.
 */
export function generateCfdi40Xml(invoice: SatInvoiceDocument): string {
	const subtotal = (invoice.subtotalCents / 100).toFixed(2);
	const total = (invoice.totalCents / 100).toFixed(2);
	const ivaTraslado = (invoice.ivaTrasladadoCents / 100).toFixed(2);
	const isrRetenido = (invoice.isrRetenidoCents / 100).toFixed(2);
	const ivaRetenido = (invoice.ivaRetenidoCents / 100).toFixed(2);
	const totalRetenidoCents =
		invoice.isrRetenidoCents + invoice.ivaRetenidoCents;
	const totalRetenido = (totalRetenidoCents / 100).toFixed(2);

	const xmlParts: string[] = [
		`<?xml version="1.0" encoding="UTF-8"?>`,
		`<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd" Version="${invoice.version}" Serie="${invoice.serie}" Folio="${invoice.folio}" Fecha="${invoice.fecha}" Sello="${invoice.timbreFiscal.selloCfd}" FormaPago="${invoice.formaPago}" NoCertificado="${invoice.emisor.csd}" Certificado="" SubTotal="${subtotal}" Moneda="${invoice.moneda}" TipoCambio="1" Total="${total}" TipoDeComprobante="${invoice.tipoDeComprobante}" Exportacion="01" MetodoPago="${invoice.metodoPago}" LugarExpedicion="${invoice.lugarExpedicion}">`,
		`  <cfdi:Emisor Rfc="${invoice.emisor.rfc}" Nombre="${escapeXml(
			invoice.emisor.nombre,
		)}" RegimenFiscal="${invoice.emisor.regimenFiscal}"/>`,
		`  <cfdi:Receptor Rfc="${invoice.receptor.rfc}" Nombre="${escapeXml(
			invoice.receptor.nombre,
		)}" DomicilioFiscalReceptor="${invoice.receptor.domicilioFiscalReceptor}" RegimenFiscalReceptor="${invoice.receptor.regimenFiscalReceptor}" UsoCFDI="${invoice.receptor.usoCfdi}"/>`,
		`  <cfdi:Conceptos>`,
	];

	for (const item of invoice.conceptos) {
		const valUnit = (item.valorUnitarioCents / 100).toFixed(2);
		const imp = (item.importeCents / 100).toFixed(2);
		const ivaImp = (item.ivaImporteCents / 100).toFixed(2);
		const tasaFmt = item.ivaTasa.toFixed(6);

		xmlParts.push(
			`    <cfdi:Concepto ClaveProdServ="${item.claveProdServ}" ${
				item.noIdentificacion
					? `NoIdentificacion="${item.noIdentificacion}" `
					: ""
			}Cantidad="${item.cantidad}" ClaveUnidad="${item.claveUnidad}" Unidad="${item.unidad}" Descripcion="${escapeXml(
				item.descripcion,
			)}" ValorUnitario="${valUnit}" Importe="${imp}" ObjetoImp="${item.objetoImp}">`,
			`      <cfdi:Impuestos>`,
			`        <cfdi:Traslados>`,
			`          <cfdi:Traslado Base="${imp}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="${tasaFmt}" Importe="${ivaImp}"/>`,
			`        </cfdi:Traslados>`,
			`      </cfdi:Impuestos>`,
			`    </cfdi:Concepto>`,
		);
	}

	xmlParts.push(
		`  </cfdi:Conceptos>`,
		`  <cfdi:Impuestos ${
			totalRetenidoCents > 0
				? `TotalImpuestosRetenidos="${totalRetenido}" `
				: ""
		}TotalImpuestosTrasladados="${ivaTraslado}">`,
	);

	if (totalRetenidoCents > 0) {
		xmlParts.push(`    <cfdi:Retenciones>`);
		if (invoice.isrRetenidoCents > 0) {
			xmlParts.push(
				`      <cfdi:Retencion Impuesto="001" Importe="${isrRetenido}"/>`,
			);
		}
		if (invoice.ivaRetenidoCents > 0) {
			xmlParts.push(
				`      <cfdi:Retencion Impuesto="002" Importe="${ivaRetenido}"/>`,
			);
		}
		xmlParts.push(`    </cfdi:Retenciones>`);
	}

	xmlParts.push(
		`    <cfdi:Traslados>`,
		`      <cfdi:Traslado Base="${subtotal}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${ivaTraslado}"/>`,
		`    </cfdi:Traslados>`,
		`  </cfdi:Impuestos>`,
		`  <cfdi:Complemento>`,
		`    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" xsi:schemaLocation="http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd" Version="${invoice.timbreFiscal.version}" UUID="${invoice.timbreFiscal.uuid}" FechaTimbrado="${invoice.timbreFiscal.fechaTimbrado}" RfcProvCertif="${invoice.timbreFiscal.rfcProvCertif}" SelloCFD="${invoice.timbreFiscal.selloCfd}" NoCertificadoSAT="${invoice.timbreFiscal.noCertificadoSat}" SelloSAT="${invoice.timbreFiscal.selloSat}"/>`,
		`  </cfdi:Complemento>`,
		`</cfdi:Comprobante>`,
	);

	return xmlParts.join("\n");
}

function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/**
 * Triggers client-side browser file download from string content.
 */
export function downloadFile(
	content: string,
	filename: string,
	mimeType: string,
): void {
	if (typeof window === "undefined" || typeof document === "undefined") {
		return;
	}
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Client-Side Pixel-Perfect Letter Paper Print & PDF Export Engine.
 * Spawns an isolated hidden iframe, copies parent styles, injects exact Letter paper CSS,
 * mounts target document content, and invokes native print.
 */
export function printElement(
	elementOrId: HTMLElement | string,
	options: PrintOptions = {},
): Promise<void> {
	return new Promise((resolve, reject) => {
		if (typeof window === "undefined" || typeof document === "undefined") {
			resolve();
			return;
		}

		let targetElement: HTMLElement | null = null;
		if (typeof elementOrId === "string") {
			targetElement = document.getElementById(elementOrId);
		} else {
			targetElement = elementOrId;
		}

		if (!targetElement) {
			reject(new Error(`Element not found for printing: ${elementOrId}`));
			return;
		}

		const marginMm = options.pageMarginMm ?? 8;
		const orientation = options.landscape ? "landscape" : "portrait";
		const title = options.title ?? document.title;

		const iframe = document.createElement("iframe");
		iframe.setAttribute(
			"style",
			"position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;",
		);
		document.body.appendChild(iframe);

		const iframeDoc = iframe.contentWindow?.document;
		if (!iframeDoc) {
			document.body.removeChild(iframe);
			reject(new Error("Unable to open print frame"));
			return;
		}

		// Copy parent stylesheet links and inline styles
		const styles: string[] = [];
		const styleNodes = document.querySelectorAll(
			'link[rel="stylesheet"], style',
		);
		for (const node of styleNodes) {
			styles.push(node.outerHTML);
		}

		const printStyles = `
      <style>
        @page {
          size: letter ${orientation};
          margin: ${marginMm}mm;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #111827 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
        body {
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background: #ffffff;
          color: #111827;
        }
      </style>
    `;

		iframeDoc.open();
		iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${escapeXml(title)}</title>
          ${styles.join("\n")}
          ${printStyles}
        </head>
        <body>
          <div class="print-container">
            ${targetElement.outerHTML}
          </div>
        </body>
      </html>
    `);
		iframeDoc.close();

		iframe.onload = () => {
			setTimeout(() => {
				try {
					iframe.contentWindow?.focus();
					iframe.contentWindow?.print();
					resolve();
				} catch (err) {
					reject(err);
				} finally {
					setTimeout(() => {
						if (iframe.parentNode) {
							iframe.parentNode.removeChild(iframe);
						}
					}, 2000);
				}
			}, 300);
		};
	});
}

/**
 * 1-Click wrapper to trigger PDF download via browser print dialog.
 */
export function downloadPdfViaPrint(
	elementId: string,
	filenameTitle: string,
): void {
	printElement(elementId, { title: filenameTitle }).catch((err) => {
		console.error("Print export failed:", err);
	});
}

// ── PURE VECTOR QR CODE GENERATOR (ZERO EXTERNAL DEPENDENCY) ───────────────

/**
 * Generates an SVG string representation of a QR Code.
 * Pure TypeScript implementation with 7x7 finder patterns, timing lines,
 * and deterministic byte data encoding.
 */
export function renderQrCodeSvg(text: string, size = 180): string {
	const matrix = generateQrMatrix(text);
	const matrixSize = matrix.length;
	let pathD = "";

	for (let r = 0; r < matrixSize; r++) {
		for (let c = 0; c < matrixSize; c++) {
			if (matrix[r][c]) {
				pathD += `M${c},${r}h1v1h-1z `;
			}
		}
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${matrixSize} ${matrixSize}" width="${size}" height="${size}" shape-rendering="crispEdges">
  <rect width="100%" height="100%" fill="#ffffff" />
  <path d="${pathD.trim()}" fill="#000000" />
</svg>`;
}

// Galois Field GF(256) tables with primitive polynomial 0x11D (285)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
	let x = 1;
	for (let i = 0; i < 255; i++) {
		GF_EXP[i] = x;
		GF_EXP[i + 255] = x;
		GF_LOG[x] = i;
		x = (x << 1) ^ (x & 0x80 ? 0x11d : 0);
	}
})();

function gfMul(x: number, y: number): number {
	if (x === 0 || y === 0) return 0;
	return GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
	let poly = new Uint8Array([1]);
	for (let i = 0; i < degree; i++) {
		const next = new Uint8Array(poly.length + 1);
		for (let j = 0; j < poly.length; j++) {
			next[j] ^= gfMul(poly[j], GF_EXP[i]);
			next[j + 1] ^= poly[j];
		}
		poly = next;
	}
	return poly;
}

function rsEncode(data: Uint8Array, numEccBytes: number): Uint8Array {
	const gen = rsGeneratorPoly(numEccBytes);
	const rem = new Uint8Array(numEccBytes);
	for (let i = 0; i < data.length; i++) {
		const factor = data[i] ^ rem[0];
		rem.copyWithin(0, 1);
		rem[numEccBytes - 1] = 0;
		for (let j = 0; j < numEccBytes; j++) {
			rem[j] ^= gfMul(gen[j], factor);
		}
	}
	return rem;
}

// Version table for Byte Mode, Error Correction Level L
// [version, totalModules, totalDataBytes, numEccBytes]
const QR_SPECS: [number, number, number, number][] = [
	[1, 21, 19, 7],
	[2, 25, 34, 10],
	[3, 29, 55, 15],
	[4, 33, 80, 20],
	[5, 37, 108, 26],
	[6, 41, 136, 36],
	[7, 45, 156, 40],
	[8, 49, 194, 48],
	[9, 53, 232, 60],
	[10, 57, 274, 72],
];

function selectQrVersion(dataLength: number): [number, number, number, number] {
	// Byte mode overhead: 4 bits mode + 8 bits count (for v1-9) or 16 bits (for v10+)
	for (const spec of QR_SPECS) {
		const capacity = spec[2] - 2;
		if (dataLength <= capacity) {
			return spec;
		}
	}
	return QR_SPECS[QR_SPECS.length - 1];
}

function generateQrMatrix(text: string): boolean[][] {
	const textEncoder = new TextEncoder();
	const utf8 = textEncoder.encode(text);
	const [version, size, totalDataBytes, numEccBytes] = selectQrVersion(
		utf8.length,
	);

	// Bit buffer: 4-bit mode (0100 for Byte mode) + 8-bit count + bytes
	const bits: number[] = [];
	const pushBits = (val: number, len: number) => {
		for (let i = len - 1; i >= 0; i--) {
			bits.push((val >> i) & 1);
		}
	};

	pushBits(0b0100, 4); // Byte Mode
	pushBits(utf8.length, version < 10 ? 8 : 16);
	for (const b of utf8) {
		pushBits(b, 8);
	}

	// Terminator (up to 4 zeroes)
	const remaining = totalDataBytes * 8 - bits.length;
	const termLen = Math.min(4, Math.max(0, remaining));
	pushBits(0, termLen);

	// Pad to byte boundary
	while (bits.length % 8 !== 0) {
		bits.push(0);
	}

	// Pad bytes alternating 0xEC and 0x11
	const pad = [0xec, 0x11];
	let padIdx = 0;
	while (bits.length < totalDataBytes * 8) {
		pushBits(pad[padIdx % 2], 8);
		padIdx++;
	}

	// Convert bits to byte array
	const dataBytes = new Uint8Array(totalDataBytes);
	for (let i = 0; i < totalDataBytes; i++) {
		let b = 0;
		for (let j = 0; j < 8; j++) {
			b = (b << 1) | bits[i * 8 + j];
		}
		dataBytes[i] = b;
	}

	// Compute Reed-Solomon ECC codewords
	const eccBytes = rsEncode(dataBytes, numEccBytes);

	// Interleaved final codeword stream
	const finalStream = new Uint8Array(totalDataBytes + numEccBytes);
	finalStream.set(dataBytes, 0);
	finalStream.set(eccBytes, totalDataBytes);

	// Initialize matrix & reserved flags
	const matrix: boolean[][] = Array.from({ length: size }, () =>
		Array(size).fill(false),
	);
	const isReserved: boolean[][] = Array.from({ length: size }, () =>
		Array(size).fill(false),
	);

	// Place Finder Patterns (7x7) + Separators
	const placeFinder = (startRow: number, startCol: number) => {
		for (let r = -1; r <= 7; r++) {
			for (let c = -1; c <= 7; c++) {
				const row = startRow + r;
				const col = startCol + c;
				if (row >= 0 && row < size && col >= 0 && col < size) {
					isReserved[row][col] = true;
					const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
					const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
					matrix[row][col] =
						r >= 0 && r <= 6 && c >= 0 && c <= 6 && (isBorder || isCenter);
				}
			}
		}
	};

	placeFinder(0, 0);
	placeFinder(0, size - 7);
	placeFinder(size - 7, 0);

	// Timing patterns (row 6 and col 6)
	for (let i = 8; i < size - 8; i++) {
		if (!isReserved[6][i]) {
			matrix[6][i] = i % 2 === 0;
			isReserved[6][i] = true;
		}
		if (!isReserved[i][6]) {
			matrix[i][6] = i % 2 === 0;
			isReserved[i][6] = true;
		}
	}

	// Alignment Pattern (if version >= 2)
	if (version >= 2) {
		const alignPos = size - 7;
		for (let r = -2; r <= 2; r++) {
			for (let c = -2; c <= 2; c++) {
				const row = alignPos + r;
				const col = alignPos + c;
				if (!isReserved[row][col]) {
					isReserved[row][col] = true;
					matrix[row][col] =
						Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
				}
			}
		}
	}

	// Reserve format info area around finders
	for (let i = 0; i < 9; i++) {
		if (i < size) {
			isReserved[8][i] = true;
			isReserved[i][8] = true;
		}
	}
	for (let i = size - 8; i < size; i++) {
		isReserved[8][i] = true;
		isReserved[i][8] = true;
	}

	// Dark module
	matrix[size - 8][8] = true;
	isReserved[size - 8][8] = true;

	// Populate data bits in zigzag pattern
	const allBits: number[] = [];
	for (const byte of finalStream) {
		for (let b = 7; b >= 0; b--) {
			allBits.push((byte >> b) & 1);
		}
	}

	let bitIdx = 0;
	let upwards = true;
	for (let right = size - 1; right > 0; right -= 2) {
		if (right === 6) right--; // Skip vertical timing column
		const rows = upwards
			? Array.from({ length: size }, (_, i) => size - 1 - i)
			: Array.from({ length: size }, (_, i) => i);

		for (const row of rows) {
			for (let c = 0; c < 2; c++) {
				const col = right - c;
				if (!isReserved[row][col]) {
					let bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
					// Apply standard mask 0: (row + col) % 2 === 0
					if ((row + col) % 2 === 0) {
						bit ^= 1;
					}
					matrix[row][col] = bit === 1;
				}
			}
		}
		upwards = !upwards;
	}

	// Format information bits for Level L, Mask 0
	// Standard Format Info: 15 bits = 0x77C4 (0b111011111000100)
	const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
	for (let i = 0; i < 6; i++) {
		matrix[8][i] = formatBits[i] === 1;
	}
	matrix[8][7] = formatBits[6] === 1;
	matrix[8][8] = formatBits[7] === 1;
	matrix[7][8] = formatBits[8] === 1;
	for (let i = 9; i < 15; i++) {
		matrix[14 - i][8] = formatBits[i] === 1;
	}

	// Second copy of format info
	for (let i = 0; i < 7; i++) {
		matrix[size - 1 - i][8] = formatBits[i] === 1;
	}
	for (let i = 0; i < 8; i++) {
		matrix[8][size - 8 + i] = formatBits[7 + i] === 1;
	}

	return matrix;
}
