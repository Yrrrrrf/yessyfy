import { type } from "arktype";

/**
 * Mexican RFC (Registro Federal de Contribuyentes)
 * - Persona Moral: 3 uppercase letters/&/Ñ, 6 digits (YYMMDD), 3 alphanumeric homoclave chars (12 chars)
 * - Persona Física: 4 uppercase letters/&/Ñ, 6 digits (YYMMDD), 3 alphanumeric homoclave chars (13 chars)
 * - Generic: XAXX010101000 (public), XEXX010101000 (foreign)
 */
export const rfcSchema = type(
	/^([A-Z&Ñ]{3}[0-9]{6}[A-Z0-9]{3}|[A-Z&Ñ]{4}[0-9]{6}[A-Z0-9]{3})$/,
);

/**
 * SAT UUID (Folio Fiscal): RFC 4122 v4 UUID
 */
export const satUuidSchema = type(
	/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
);

/**
 * SAT CSD (Certificado de Sello Digital): exactly 20 digits
 */
export const satCsdSchema = type(/^[0-9]{20}$/);

/**
 * SAT Regímenes Fiscales (Catalog c_RegimenFiscal CFDI 4.0)
 */
export const satRegimenFiscalSchema = type(
	"'601' | '603' | '605' | '606' | '608' | '612' | '616' | '621' | '625' | '626'",
);

/**
 * SAT Uso de CFDI (Catalog c_UsoCFDI CFDI 4.0)
 */
export const satUsoCfdiSchema = type(
	"'G01' | 'G02' | 'G03' | 'I01' | 'I02' | 'D01' | 'D02' | 'D04' | 'S01' | 'CP01'",
);

/**
 * SAT Clave Producto o Servicio (Catalog c_ClaveProdServ)
 */
export const satClaveProdServSchema = type(
	"'72101500' | '72101501' | '72101502' | '81112200' | '72102900'",
);

export const satFormaPagoSchema = type("'01' | '03' | '04' | '28' | '99'");

export const satMetodoPagoSchema = type("'PUE' | 'PPD'");

export const satTipoComprobanteSchema = type("'I' | 'E' | 'T' | 'P' | 'N'");

export const satEmisorSchema = type({
	rfc: rfcSchema,
	nombre: "string >= 3",
	regimenFiscal: satRegimenFiscalSchema,
	csd: satCsdSchema,
});

export const satReceptorSchema = type({
	rfc: rfcSchema,
	nombre: "string >= 3",
	domicilioFiscalReceptor: "string == 5",
	regimenFiscalReceptor: satRegimenFiscalSchema,
	usoCfdi: satUsoCfdiSchema,
});

export const satInvoiceItemSchema = type({
	claveProdServ: satClaveProdServSchema,
	"noIdentificacion?": "string",
	cantidad: "number >= 1",
	claveUnidad: "string", // 'E48' (Unidad de servicio)
	unidad: "string", // 'Servicio'
	descripcion: "string >= 3",
	valorUnitarioCents: "number >= 0",
	importeCents: "number >= 0",
	objetoImp: "'01' | '02' | '03'", // '02' = Sí objeto de impuesto
	ivaTasa: "number", // 0.160000
	ivaImporteCents: "number >= 0",
});

export const satTimbreFiscalDigitalSchema = type({
	version: "'1.1'",
	uuid: satUuidSchema,
	fechaTimbrado: "string",
	rfcProvCertif: rfcSchema,
	noCertificadoSat: satCsdSchema,
	selloCfd: "string",
	selloSat: "string",
	cadenaOriginalSat: "string",
	qrCodeUrl: "string",
});

/**
 * CFDI 4.0 Stamped Invoice Document Schema
 * Compliant with Annex 20 SAT RMF & Mexican Tax Law (LISR Art. 113-A, LIVA Art. 18-J)
 */
export const satInvoiceDocumentSchema = type({
	version: "'4.0'",
	serie: "string",
	folio: "string",
	fecha: "string",
	formaPago: satFormaPagoSchema,
	metodoPago: satMetodoPagoSchema,
	tipoDeComprobante: satTipoComprobanteSchema,
	lugarExpedicion: "string == 5",
	moneda: "'MXN'",
	subtotalCents: "number >= 0",
	"descuentoCents?": "number >= 0",
	ivaTrasladadoCents: "number >= 0",
	// LISR Art. 113-A withholding (1.0% ISR)
	isrRetenidoCents: "number >= 0",
	// LIVA Art. 18-J retention (8.0% IVA)
	ivaRetenidoCents: "number >= 0",
	totalCents: "number >= 0",
	emisor: satEmisorSchema,
	receptor: satReceptorSchema,
	conceptos: satInvoiceItemSchema.array(),
	timbreFiscal: satTimbreFiscalDigitalSchema,
});

/**
 * 30-Day Legal Warranty Certificate Schema
 * Compliant with Articles 77-84 of Ley Federal de Protección al Consumidor (LFPC / PROFECO)
 * and NOM-151-SCFI-2016 cryptographic time stamp.
 */
export const legalWarrantyDocumentSchema = type({
	certificateNumber: "string", // YSF-WAR-XXXXX
	jobOrderId: "string",
	jobCode: "string",
	serviceCategory: "string",
	serviceDescription: "string",
	customerId: "string",
	customerName: "string",
	customerPhone: "string",
	customerAddress: "string",
	collaboratorId: "string",
	collaboratorName: "string",
	collaboratorTrade: "string",
	validFrom: "string",
	validUntil: "string",
	status: "'active' | 'claimed' | 'serviced' | 'voided' | 'expired'",
	termsHash: "string", // SHA-256 hash of service terms and QA evidence
	coverageAmountCents: "number >= 0", // $500,000 MXN = 50000000 cents
	insurancePolicy: {
		insurer: "string",
		policyNumber: "string",
		coverageDescription: "string",
		maxCoverageCents: "number",
		deductibleCents: "number",
	},
	nom151: {
		certificateAuthority: "string",
		timestamp: "string",
		digestAlgorithm: "'SHA-256'",
		digest: "string",
		evidenceReceipt: "string",
	},
	legalFramework: "string",
	createdAt: "string",
});

export type SatRfc = typeof rfcSchema.infer;
export type SatUuid = typeof satUuidSchema.infer;
export type SatCsd = typeof satCsdSchema.infer;
export type SatRegimenFiscal = typeof satRegimenFiscalSchema.infer;
export type SatUsoCfdi = typeof satUsoCfdiSchema.infer;
export type SatClaveProdServ = typeof satClaveProdServSchema.infer;
export type SatEmisor = typeof satEmisorSchema.infer;
export type SatReceptor = typeof satReceptorSchema.infer;
export type SatInvoiceItem = typeof satInvoiceItemSchema.infer;
export type SatTimbreFiscalDigital = typeof satTimbreFiscalDigitalSchema.infer;
export type SatInvoiceDocument = typeof satInvoiceDocumentSchema.infer;
export type LegalWarrantyDocument = typeof legalWarrantyDocumentSchema.infer;
