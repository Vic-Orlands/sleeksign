import type { Field, RoleConfig, WorkflowMode } from "$lib/field-utils";

export type SigningEntryStatus = "pending" | "completed";

export type SigningEntryRecord = {
	id: string;
	artifactKind: "packet" | "copy";
	packetId: string;
	documentId: string;
	status: SigningEntryStatus;
	finalizedFileUrl?: string | null;
	finalizedStorageKey?: string | null;
	verificationId?: string | null;
	signerName?: string | null;
	signerEmail?: string | null;
	signerRole?: string | null;
	signerIp?: string | null;
	signerUserAgent?: string | null;
	completedAt?: string | number | Date | null;
	deletedAt?: string | number | Date | null;
	createdAt: string | number | Date;
};

export type PacketCopySummary = {
	id: string;
	roleName: string;
	signerName?: string | null;
	signerEmail?: string | null;
	recipientType?: "email" | "signer" | "group" | "bulk" | null;
	status: SigningEntryStatus;
	completedAt?: string | number | Date | null;
	finalizedFileUrl?: string | null;
	finalizedStorageKey?: string | null;
	createdAt: string | number | Date;
	verificationId?: string | null;
	deletedAt?: string | number | Date | null;
};

export type PacketActivitySummary = {
	id: string;
	mode: WorkflowMode;
	status: string;
	createdAt: string | number | Date;
	completedAt?: string | number | Date | null;
	finalizedFileUrl?: string | null;
	finalizedStorageKey?: string | null;
	verificationId?: string | null;
	deletedAt?: string | number | Date | null;
	roleConfigs: RoleConfig[];
	copies: PacketCopySummary[];
};

export type DocumentVerificationSummary = {
	id: string;
	artifactType: "session" | "packet" | "copy";
	artifactId: string;
	status: "active" | "revoked";
	finalizedAt: string | number | Date;
};

export type DocumentRecord = {
	id: string;
	name: string;
	fileUrl: string | null;
	storageKey?: string | null;
	storageProvider?: string | null;
	uploadStatus?: "pending_upload" | "ready" | "failed";
	uploadProgress?: number;
	fileSize?: number | null;
	contentType?: string | null;
	teamId?: string | null;
	requireOtp?: boolean;
	createdAt: string | number | Date;
	archivedAt?: string | number | Date | null;
	deletedAt?: string | number | Date | null;
	isTemplate?: boolean;
	signerRoles?: string[];
	roleConfigs?: RoleConfig[];
	fields?: Field[];
	signingEntries?: SigningEntryRecord[];
	packets?: PacketActivitySummary[];
	verifications?: DocumentVerificationSummary[];
};

export type DocumentStatus = "Pending" | "In Progress" | "Completed";
export type DocumentSetupStatus = "Needs Setup" | "Edited";

export function getDocumentType(name: string) {
	const lower = name.toLowerCase();
	if (lower.includes("nda")) return "NDA";
	if (lower.includes("offer")) return "Offer Letter";
	if (lower.includes("w-4") || lower.includes("tax")) return "Tax Form";
	if (lower.includes("handbook")) return "Acknowledgment";
	if (lower.includes("i-9") || lower.includes("eligibility")) return "Compliance";
	return "Document";
}

export function getDocumentStatus(document: DocumentRecord): DocumentStatus {
	const signingEntries = document.signingEntries || [];
	if (signingEntries.length === 0) return "Pending";
	if (signingEntries.every((entry) => entry.status === "completed")) return "Completed";
	return "In Progress";
}

export function getDocumentSetupStatus(document: DocumentRecord): DocumentSetupStatus {
	return (document.fields?.length || 0) > 0 ? "Edited" : "Needs Setup";
}

export function getDocumentCounts(document: DocumentRecord) {
	const signingEntries = document.signingEntries || [];
	const completed = signingEntries.filter((entry) => entry.status === "completed").length;
	const pending = signingEntries.length - completed;
	const fields = document.fields || [];
	const signatureFields = fields.filter((field) => field.type === "signature");
	const requiredSignatures = signatureFields.filter((field) => field.required).length;
	const optionalSignatures = signatureFields.length - requiredSignatures;
	const requiredFields = fields.filter((field) => field.required).length;
	const optionalFields = fields.length - requiredFields;

	return {
		fields: fields.length,
		pending,
		completed,
		total: signingEntries.length,
		requiredFields,
		optionalFields,
		signatureFields: signatureFields.length,
		requiredSignatures,
		optionalSignatures,
	};
}

export function getWorkflowModeLabel(mode: WorkflowMode | string) {
	if (mode === "collaborative") return "Collaborative";
	if (mode === "individual") return "Individual";
	if (mode === "shared-base") return "Shared base";
	return mode;
}

export function getRecipientTypeLabel(
	type: PacketCopySummary["recipientType"] | string | null | undefined,
) {
	if (type === "signer") return "Directory signer";
	if (type === "group") return "Group";
	if (type === "bulk") return "Bulk CSV";
	return "Email";
}

export function getFieldTypeLabel(type: string) {
	if (type === "signature") return "Signature";
	if (type === "text") return "Text";
	if (type === "date") return "Date";
	if (type === "checkbox") return "Checkbox";
	return type;
}

export type SharedRecipient = PacketCopySummary & {
	packetId: string;
	mode: WorkflowMode;
};

export function getDocumentShareActivity(document: DocumentRecord) {
	const packets = document.packets || [];
	const emailedRecipients: SharedRecipient[] = packets.flatMap((packet) =>
		packet.copies
			.filter((copy) => Boolean(copy.signerEmail?.trim()))
			.map((copy) => ({
				...copy,
				packetId: packet.id,
				mode: packet.mode,
			})),
	);

	const linkPackets = packets.filter(
		(packet) => !packet.copies.some((copy) => Boolean(copy.signerEmail?.trim())),
	);

	const modes = [...new Set(packets.map((packet) => packet.mode))];
	const signatureFields = (document.fields || []).filter((field) => field.type === "signature");

	return {
		packets,
		modes,
		emailedRecipients,
		linkPackets,
		hasLinkShare: linkPackets.length > 0,
		hasEmailShare: emailedRecipients.length > 0,
		signatureFields,
	};
}

export function getInitials(name?: string | null) {
	if (!name) return "AK";
	return name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");
}
