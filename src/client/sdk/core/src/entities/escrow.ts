export type EscrowAccountType =
	| "customer_funds_payable"
	| "escrow_transit"
	| "platform_commission_income"
	| "gateway_expense"
	| "sat_tax_payable"
	| "collaborator_payable"
	| "dispute_reserve";

export interface EscrowAccount {
	id: string;
	accountType: EscrowAccountType;
	balanceCents: number;
	currency: string;
	updatedAt: string;
}

export interface EscrowEntry {
	id: string;
	transactionId: string;
	idempotencyKey: string;
	jobOrderId?: string;
	debitAccountId: string;
	creditAccountId: string;
	amountCents: number;
	memo: string;
	createdAt: string;
}
