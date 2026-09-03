export type ChatSenderRole =
	| "client"
	| "collaborator"
	| "system"
	| "operations";

export interface ChatMessage {
	id: string;
	orderCode: string;
	sender: ChatSenderRole;
	senderName: string;
	text: string;
	timestamp: string;
	masked: boolean;
	isAutomated?: boolean;
}
