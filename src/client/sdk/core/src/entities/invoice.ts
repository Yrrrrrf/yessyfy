export type CfdiType = "ingreso_comision" | "retencion_plataforma";

export interface TaxInvoice {
	id: string;
	jobOrderId: string;
	cfdiType: CfdiType;
	uuid: string; // SAT Fiscal UUID
	rfcEmisor: string;
	rfcReceptor: string;
	totalCents: number;
	xmlUrl: string;
	pdfUrl: string;
	pacResponseCode?: string;
	stampedAt: string;
	createdAt: string;
}
