import type { SatInvoiceDocument } from "@sdk/core";
import { describe, expect, it } from "vite-plus/test";
import {
	buildSatVerificationUrl,
	generateCfdi40Xml,
	renderQrCodeSvg,
} from "./pdfExport.ts";

describe("Fiscal PDF Export & Annex 20 XML Engine", () => {
	describe("buildSatVerificationUrl", () => {
		it("validates official SAT verification URL query parameters format (id, re, rr, tt, fe)", () => {
			const uuid = "8F3A2B1C-9E4D-4A7F-B2C1-3E5A7D9F1B2C";
			const rfcE = "YSF260101ABC";
			const rfcR = "MORA850612ABC";
			const totalCents = 107000; // $1,070.00 MXN -> 1070.000000
			const selloCfd =
				"BqY8xLmZ7K2pQwRtUyOiPlKjHgFdSaZxCvBnMqWeRtYuIoPzAxScVbNmQwErTyUiOpAsDfGhJkLzXcVbNmQwErTyUiOpAsDfGhJkLzXc==";

			const url = buildSatVerificationUrl(
				uuid,
				rfcE,
				rfcR,
				totalCents,
				selloCfd,
			);

			expect(url).toContain(
				"https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?",
			);

			const parsedUrl = new URL(url);
			expect(parsedUrl.searchParams.get("id")).toBe(uuid);
			expect(parsedUrl.searchParams.get("re")).toBe("YSF260101ABC");
			expect(parsedUrl.searchParams.get("rr")).toBe("MORA850612ABC");
			expect(parsedUrl.searchParams.get("tt")).toBe("1070.000000");
			expect(parsedUrl.searchParams.get("fe")).toBe(selloCfd.slice(-8));
		});
	});

	describe("renderQrCodeSvg", () => {
		it("validates SVG QR Code markup generation (viewBox, rect, path)", () => {
			const sampleUrl =
				"https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=8F3A2B1C-9E4D-4A7F-B2C1-3E5A7D9F1B2C&re=YSF260101ABC&rr=MORA850612ABC&tt=1070.000000&fe=JkLzXc==";
			const svg = renderQrCodeSvg(sampleUrl, 200);

			expect(svg).toContain("<svg");
			expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
			expect(svg).toContain('viewBox="0 0');
			expect(svg).toContain('width="200"');
			expect(svg).toContain('height="200"');
			expect(svg).toContain("<rect");
			expect(svg).toContain('fill="#ffffff"');
			expect(svg).toContain("<path");
			expect(svg).toContain('fill="#000000"');
		});
	});

	describe("generateCfdi40Xml", () => {
		const sampleInvoice: SatInvoiceDocument = {
			version: "4.0",
			serie: "YSF",
			folio: "0881",
			fecha: "2026-09-05T12:00:00",
			formaPago: "03",
			metodoPago: "PUE",
			tipoDeComprobante: "I",
			lugarExpedicion: "11560",
			moneda: "MXN",
			subtotalCents: 100000,
			ivaTrasladadoCents: 16000,
			isrRetenidoCents: 1000, // 1.0% LISR 113-A
			ivaRetenidoCents: 8000, // 8.0% LIVA 18-J
			totalCents: 107000,
			emisor: {
				rfc: "YSF260101ABC",
				nombre: "YESSYFY TECNOLOGÍAS S.A.P.I. DE C.V.",
				regimenFiscal: "601",
				csd: "00001000000508923412",
			},
			receptor: {
				rfc: "MORA850612ABC",
				nombre: "ROBERTO MORALES ÁLVAREZ",
				domicilioFiscalReceptor: "06700",
				regimenFiscalReceptor: "612",
				usoCfdi: "G03",
			},
			conceptos: [
				{
					claveProdServ: "72101501",
					noIdentificacion: "SRV-PLOM-001",
					cantidad: 1,
					claveUnidad: "E48",
					unidad: "Servicio",
					descripcion:
						"Servicio de plomería correctiva y reemplazo de tubería de cobre",
					valorUnitarioCents: 100000,
					importeCents: 100000,
					objetoImp: "02",
					ivaTasa: 0.16,
					ivaImporteCents: 16000,
				},
			],
			timbreFiscal: {
				version: "1.1",
				uuid: "8F3A2B1C-9E4D-4A7F-B2C1-3E5A7D9F1B2C",
				fechaTimbrado: "2026-09-05T12:01:04",
				rfcProvCertif: "SED1102088J7",
				noCertificadoSat: "00001000000504465028",
				selloCfd: "BqY8xLmZ7K2pQwRtUyOiPlKjHgFdSaZxCvBnMqWeRtYuIoPzAxScVbNm==",
				selloSat: "K8jN2pXy9A3bC4dE5fG6hI7jK8lM9nO0pQ1rS2tU3vW4xY5z01234567==",
				cadenaOriginalSat:
					"||1.1|8F3A2B1C-9E4D-4A7F-B2C1-3E5A7D9F1B2C|2026-09-05T12:01:04|SED1102088J7|BqY8xLmZ...||",
				qrCodeUrl:
					"https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=8F3A2B1C-9E4D-4A7F-B2C1-3E5A7D9F1B2C",
			},
		};

		it("validates Annex 20 CFDI 4.0 XML structure and required namespace attributes", () => {
			const xml = generateCfdi40Xml(sampleInvoice);

			expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
			expect(xml).toContain("<cfdi:Comprobante");
			expect(xml).toContain('xmlns:cfdi="http://www.sat.gob.mx/cfd/4"');
			expect(xml).toContain(
				'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
			);
			expect(xml).toContain(
				'xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"',
			);
			expect(xml).toContain('Version="4.0"');
			expect(xml).toContain('Serie="YSF"');
			expect(xml).toContain('Folio="0881"');
			expect(xml).toContain('SubTotal="1000.00"');
			expect(xml).toContain('Total="1070.00"');
			expect(xml).toContain('MetodoPago="PUE"');
			expect(xml).toContain('LugarExpedicion="11560"');

			// Emisor and Receptor
			expect(xml).toContain('Rfc="YSF260101ABC"');
			expect(xml).toContain('Nombre="YESSYFY TECNOLOGÍAS S.A.P.I. DE C.V."');
			expect(xml).toContain('RegimenFiscal="601"');
			expect(xml).toContain('Rfc="MORA850612ABC"');
			expect(xml).toContain('DomicilioFiscalReceptor="06700"');
			expect(xml).toContain('RegimenFiscalReceptor="612"');
			expect(xml).toContain('UsoCFDI="G03"');

			// Conceptos
			expect(xml).toContain('ClaveProdServ="72101501"');
			expect(xml).toContain('ClaveUnidad="E48"');
			expect(xml).toContain('ObjetoImp="02"');

			// Impuestos (Withholdings: LISR 113-A and LIVA 18-J)
			expect(xml).toContain('TotalImpuestosRetenidos="90.00"');
			expect(xml).toContain('TotalImpuestosTrasladados="160.00"');
			expect(xml).toContain('<cfdi:Retencion Impuesto="001" Importe="10.00"/>');
			expect(xml).toContain('<cfdi:Retencion Impuesto="002" Importe="80.00"/>');

			// Timbre Fiscal Digital
			expect(xml).toContain("<tfd:TimbreFiscalDigital");
			expect(xml).toContain('Version="1.1"');
			expect(xml).toContain('UUID="8F3A2B1C-9E4D-4A7F-B2C1-3E5A7D9F1B2C"');
			expect(xml).toContain('RfcProvCertif="SED1102088J7"');
		});
	});
});
