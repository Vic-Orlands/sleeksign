import type { RoleConfig, WorkflowMode } from "$lib/field-utils";

export type PacketSummary = {
	id: string;
	mode: WorkflowMode;
	status: string;
	roleConfigs: Array<{ name: string; scope: "shared" | "private" }>;
};

const packetCache = new Map<string, PacketSummary[]>();
const inflight = new Map<string, Promise<PacketSummary[]>>();

export function getCachedPackets(documentId: string) {
	return packetCache.get(documentId);
}

export function setCachedPackets(documentId: string, packets: PacketSummary[]) {
	packetCache.set(documentId, packets);
}

export async function fetchSigningPackets(
	documentId: string,
	options?: { force?: boolean },
): Promise<PacketSummary[]> {
	if (!options?.force) {
		const cached = packetCache.get(documentId);
		if (cached) return cached;

		const pending = inflight.get(documentId);
		if (pending) return pending;
	}

	const request = (async () => {
		const res = await fetch(
			`/api/signing-packets?documentId=${encodeURIComponent(documentId)}`,
		);
		const data = await res.json();
		const next = Array.isArray(data) ? (data as PacketSummary[]) : [];
		packetCache.set(documentId, next);
		return next;
	})().finally(() => {
		inflight.delete(documentId);
	});

	inflight.set(documentId, request);
	return request;
}

export function upsertCachedPacket(documentId: string, packet: PacketSummary) {
	const existing = packetCache.get(documentId) || [];
	const next = [packet, ...existing.filter((entry) => entry.id !== packet.id)];
	packetCache.set(documentId, next);
	return next;
}

export type { RoleConfig };
