import { type } from "arktype";
import { assertEquals } from "jsr:@std/assert@1";
import {
	legalWarrantyDocumentSchema,
	rfcSchema,
	satCsdSchema,
	satInvoiceDocumentSchema,
	satUuidSchema,
} from "./fiscal.ts";

Deno.test("Fiscal Schemas: validates RFC Persona Moral (12 chars)", () => {
	const moralRfc = "YSF260101ABC";
	const result = rfcSchema(moralRfc);
	assertEquals(result instanceof type.errors, false);
});

Deno.test("Fiscal Schemas: validates RFC Persona Física (13 chars)", () => {
	const fisicaRfc = "MORA850612ABC";
	const result = rfcSchema(fisicaRfc);
	assertEquals(result instanceof type.errors, false);
});

Deno.test("Fiscal Schemas: validates RFC generic public and foreign", () => {
	assertEquals(rfcSchema("XAXX010101000") instanceof type.errors, false);
	assertEquals(rfcSchema("XEXX010101000") instanceof type.errors, false);
});

Deno.test("Fiscal Schemas: rejects invalid RFC format", () => {
	assertEquals(rfcSchema("INVALID_RFC") instanceof type.errors, true);
	assertEquals(rfcSchema("123456789012") instanceof type.errors, true);
	assertEquals(rfcSchema("ABCD1234") instanceof type.errors, true);
});

Deno.test("Fiscal Schemas: validates SAT UUID format (RFC 4122)", () => {
	const validUuid = "8F3A2B1C-9E4D-4A7F-B2C1-3E5A7D9F1B2C";
	const result = satUuidSchema(validUuid);
	assertEquals(result instanceof type.errors, false);
});

Deno.test("Fiscal Schemas: rejects malformed SAT UUID", () => {
	assertEquals(
		satUuidSchema("8F3A2B1C-9E4D-4A7F-B2C1") instanceof type.errors,
		true,
	);
	assertEquals(
		satUuidSchema("not-a-uuid-at-all-000000000000") instanceof type.errors,
		true,
	);
});

Deno.test("Fiscal Schemas: validates 20-digit CSD certificate numbers", () => {
	const validCsd = "00001000000508923412";
	const result = satCsdSchema(validCsd);
	assertEquals(result instanceof type.errors, false);
});

Deno.test("Fiscal Schemas: rejects non-20-digit CSD", () => {
	assertEquals(satCsdSchema("12345") instanceof type.errors, true);
	assertEquals(
		satCsdSchema("00001000000508923412999") instanceof type.errors,
		true,
	);
	assertEquals(
		satCsdSchema("0000100000050892341A") instanceof type.errors,
		true,
	);
});

Deno.test("Fiscal Schemas: validates complete CFDI 4.0 document with LISR 113-A and LIVA 18-J withholdings", () => {
	// Subtotal: $1,000.00 MXN (100000 cents)
	// IVA 16%: $160.00 MXN (16000 cents)
	// ISR Retención LISR 113-A (1.0%): $10.00 MXN (1000 cents)
	// IVA Retención LIVA 18-J (8.0%): $80.00 MXN (8000 cents)
	// Total: $1,000 + $160 - $10 - $80 = $1,070.00 MXN (107000 cents)
	const subtotalCents = 100000;
	const ivaCents = 16000;
	const isrWithholdingCents = 1000; // 1.0% of subtotal
	const ivaWithholdingCents = 8000; // 8.0% of subtotal
	const totalCents =
		subtotalCents + ivaCents - isrWithholdingCents - ivaWithholdingCents;

	const sampleCfdi = {
		version: "4.0",
		serie: "YSF",
		folio: "0881",
		fecha: "2026-09-05T12:00:00",
		formaPago: "03",
		metodoPago: "PUE",
		tipoDeComprobante: "I",
		lugarExpedicion: "11560",
		moneda: "MXN",
		subtotalCents,
		ivaTrasladadoCents: ivaCents,
		isrRetenidoCents: isrWithholdingCents,
		ivaRetenidoCents: ivaWithholdingCents,
		totalCents,
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
			selloCfd: "BqY8xLmZ...==",
			selloSat: "K8jN2pXy...==",
			cadenaOriginalSat:
				"||1.1|8F3A2B1C-9E4D-4A7F-B2C1-3E5A7D9F1B2C|2026-09-05T12:01:04|SED1102088J7|...||",
			qrCodeUrl:
				"https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=8F3A2B1C-9E4D-4A7F-B2C1-3E5A7D9F1B2C",
		},
	};

	const result = satInvoiceDocumentSchema(sampleCfdi);
	assertEquals(result instanceof type.errors, false);
});

Deno.test("Fiscal Schemas: validates 30-Day Legal Warranty Certificate (LFPC Arts. 77-84 & NOM-151)", () => {
	const sampleWarranty = {
		certificateNumber: "YSF-WAR-2026-CDMX-0881",
		jobOrderId: "job_0881",
		jobCode: "YSF-2026-0881",
		serviceCategory: "plomeria",
		serviceDescription:
			"Reparación especializada de fuga de agua oculta y sustitución de válvula angular",
		customerId: "usr_cust_123",
		customerName: "Mariana Garza Lozano",
		customerPhone: "+525544332211",
		customerAddress:
			"Av. Horacio 1420, Polanco V Sección, Miguel Hidalgo, CDMX",
		collaboratorId: "usr_colab_456",
		collaboratorName: "Roberto Morales",
		collaboratorTrade: "Plomero Maestro Certificado",
		validFrom: "2026-09-05T12:00:00Z",
		validUntil: "2026-10-05T12:00:00Z",
		status: "active",
		termsHash:
			"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		coverageAmountCents: 50000000, // $500,000.00 MXN
		insurancePolicy: {
			insurer: "Seguros Afirme S.A. de C.V. / Chubb Seguros México S.A.",
			policyNumber: "RC-YSF-2026-99412",
			coverageDescription:
				"Póliza de Responsabilidad Civil y Daños a Terceros en Trabajos de Mantenimiento Residencial",
			maxCoverageCents: 50000000,
			deductibleCents: 0,
		},
		nom151: {
			certificateAuthority: "PSC-NOM151-SE-004 (Secretaría de Economía)",
			timestamp: "2026-09-05T12:05:00Z",
			digestAlgorithm: "SHA-256",
			digest:
				"a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
			evidenceReceipt:
				"TSA-CONSTANCIA-NOM151-2026-YSF-WAR-2026-CDMX-0881-CRYPTOGRAPHIC-SEAL",
		},
		legalFramework:
			"Artículos 77, 78, 79, 80, 81, 82, 83 y 84 de la Ley Federal de Protección al Consumidor (LFPC)",
		createdAt: "2026-09-05T12:05:00Z",
	};

	const result = legalWarrantyDocumentSchema(sampleWarranty);
	assertEquals(result instanceof type.errors, false);
});
