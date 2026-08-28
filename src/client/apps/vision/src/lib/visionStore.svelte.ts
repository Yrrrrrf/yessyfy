import type { JobOrder } from "@sdk";

export type VisionConsole = "kanban" | "dispatch" | "tree" | "qa" | "escrow";

export interface VisionState {
	activeConsole: VisionConsole;
	selectedAlcaldia: string;
	selectedUrgency: string;
	selectedTicketId: string | null;
	orders: JobOrder[];
}

export const INITIAL_ORDERS: JobOrder[] = [
	{
		id: "ord_101",
		code: "YSF-2026-0101",
		customerId: "usr_c1",
		customer: {
			id: "usr_c1",
			fullName: "Mariana Garza Lozano",
			phone: "+525541009988",
			role: "customer",
			status: "active",
			locale: "es-MX",
		},
		collaboratorId: "usr_t1",
		collaborator: {
			id: "usr_t1",
			fullName: "Roberto Morales Ramírez",
			phone: "+525541982301",
			role: "collaborator",
			status: "active",
			locale: "es-MX",
		},
		category: "plomeria",
		locationType: "residencial",
		urgency: "emergencia_24_7",
		status: "in_transit",
		coordinates: {
			lat: 19.4326,
			lng: -99.1332,
			latitude: 19.4326,
			longitude: -99.1332,
		},
		addressText: "Av. Horacio 1420, Polanco V Secc, CDMX",
		postalCode: "11550",
		description:
			"Fuga severa en tarja de cocina, requiere cambio de trampa y llave angular.",
		baseBudgetCents: 45000,
		supplementalCents: 0,
		totalCustomerCents: 81000,
		platformFeeCents: 12150,
		collaboratorGrossCents: 68850,
		isrWithheldCents: 1466,
		ivaWithheldCents: 5586,
		collaboratorNetCents: 61798,
		createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
		dispatchedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
	},
	{
		id: "ord_102",
		code: "YSF-2026-0102",
		customerId: "usr_c2",
		customer: {
			id: "usr_c2",
			fullName: "Carlos Slim Helú Jr.",
			phone: "+525521998877",
			role: "customer",
			status: "active",
			locale: "es-MX",
		},
		collaboratorId: "usr_t2",
		collaborator: {
			id: "usr_t2",
			fullName: "Ignacio Fuentes Silva",
			phone: "+525533112244",
			role: "collaborator",
			status: "active",
			locale: "es-MX",
		},
		category: "electricidad",
		locationType: "premium",
		urgency: "mismo_dia",
		status: "pending_validation",
		coordinates: {
			lat: 19.3621,
			lng: -99.1687,
			latitude: 19.3621,
			longitude: -99.1687,
		},
		addressText: "Coyoacán Centro, CDMX",
		postalCode: "04000",
		description:
			"Cortocircuito en tablero general e instalación de 4 pastillas termomagnéticas.",
		baseBudgetCents: 50000,
		supplementalCents: 20000,
		totalCustomerCents: 97500,
		platformFeeCents: 14625,
		collaboratorGrossCents: 82875,
		isrWithheldCents: 1765,
		ivaWithheldCents: 6724,
		collaboratorNetCents: 74386,
		createdAt: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
		arrivedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
	},
	{
		id: "ord_103",
		code: "YSF-2026-0103",
		customerId: "usr_c3",
		customer: {
			id: "usr_c3",
			fullName: "Fernanda Montes",
			phone: "+525599881122",
			role: "customer",
			status: "active",
			locale: "es-MX",
		},
		collaboratorId: "usr_t3",
		collaborator: {
			id: "usr_t3",
			fullName: "Miguel Ángel Domínguez",
			phone: "+525566778899",
			role: "collaborator",
			status: "active",
			locale: "es-MX",
		},
		category: "cerrajeria",
		locationType: "residencial",
		urgency: "normal",
		status: "disputed",
		coordinates: {
			lat: 19.4121,
			lng: -99.1722,
			latitude: 19.4121,
			longitude: -99.1722,
		},
		addressText: "Colonia Condesa, CDMX",
		postalCode: "06140",
		description:
			"Apertura de chapa de alta seguridad y cambio de cilindro Yale.",
		baseBudgetCents: 40000,
		supplementalCents: 0,
		totalCustomerCents: 40000,
		platformFeeCents: 6000,
		collaboratorGrossCents: 34000,
		isrWithheldCents: 724,
		ivaWithheldCents: 2758,
		collaboratorNetCents: 30518,
		createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
	},
];

class VisionStore {
	activeConsole = $state<VisionConsole>("kanban");
	selectedAlcaldia = $state<string>("todos");
	selectedUrgency = $state<string>("todos");
	selectedTicketId = $state<string | null>("ord_101");
	orders = $state<JobOrder[]>(INITIAL_ORDERS);

	selectedTicket = $derived(
		this.orders.find((o) => o.id === this.selectedTicketId) ||
			this.orders[0] ||
			null,
	);

	selectTicket(id: string) {
		this.selectedTicketId = id;
	}

	setConsole(c: VisionConsole) {
		this.activeConsole = c;
	}

	freezeEscrow(id: string) {
		const order = this.orders.find((o) => o.id === id);
		if (order) {
			order.status = "disputed";
		}
	}

	approveTicket(id: string) {
		const order = this.orders.find((o) => o.id === id);
		if (order) {
			order.status = "completed";
		}
	}
}

export const visionStore = new VisionStore();
