import type {
  PacketActivitySummary,
  SigningEntryRecord,
} from "$lib/components/docs/types";
import {
  fields,
  documentVerifications,
  signingPacketCopies,
  signingPackets,
  signingPacketValues,
} from "@/db/schema";
import { areRoleFieldsComplete } from "@/lib/signing-workflows";
import { parseRoleConfigs, type WorkflowMode } from "@/lib/field-utils";

type Verification = typeof documentVerifications.$inferSelect;
type Packet = typeof signingPackets.$inferSelect & {
  copies?: Array<typeof signingPacketCopies.$inferSelect>;
  values?: Array<typeof signingPacketValues.$inferSelect>;
};
type DocumentWithActivity = {
  id?: string;
  fields?: Array<typeof fields.$inferSelect>;
  packets?: Packet[];
  verifications?: Verification[];
  [key: string]: unknown;
};

function buildPacketSummaries(document: DocumentWithActivity): PacketActivitySummary[] {
  return (document.packets || []).filter((packet) => !packet.deletedAt).map((packet) => ({
    id: packet.id,
    mode: packet.mode as WorkflowMode,
    status: packet.status,
    createdAt: packet.createdAt,
    completedAt: packet.completedAt || null,
    finalizedFileUrl: packet.finalizedFileUrl || null,
    finalizedStorageKey: packet.finalizedStorageKey || null,
    verificationId:
      document.verifications?.find(
        (item) => item.artifactType === "packet" && item.artifactId === packet.id,
      )?.id || null,
    deletedAt: packet.deletedAt || null,
    roleConfigs: parseRoleConfigs(packet.roleConfigs),
    copies: (packet.copies || []).filter((copy) => !copy.deletedAt).map((copy) => ({
      id: copy.id,
      roleName: copy.roleName,
      signerName: copy.signerName,
      signerEmail: copy.signerEmail,
      recipientType: copy.recipientType,
      status: copy.status === "completed" ? "completed" : "pending",
      completedAt: copy.completedAt || null,
      finalizedFileUrl: copy.finalizedFileUrl || null,
      finalizedStorageKey: copy.finalizedStorageKey || null,
      createdAt: copy.createdAt,
      verificationId:
        document.verifications?.find(
          (item) =>
            (item.artifactType === "copy" || item.artifactType === "session") &&
            item.artifactId === copy.id,
        )?.id || null,
      deletedAt: copy.deletedAt || null,
    })),
  }));
}

function buildSigningEntries(document: DocumentWithActivity): SigningEntryRecord[] {
  return (document.packets || []).filter((packet) => !packet.deletedAt).flatMap((packet) =>
    buildPacketSigningEntries(document, packet),
  ).sort(
    (left, right) => getSigningEntryTimestamp(right) - getSigningEntryTimestamp(left),
  );
}

function buildPacketSigningEntries(
  document: DocumentWithActivity,
  packet: Packet,
): SigningEntryRecord[] {
  const roleConfigs = parseRoleConfigs(packet.roleConfigs);
  const documentFields = (document.fields || []).map((field) => ({
    ...field,
    assigneeRole: field.assigneeRole || "",
  }));
  const packetValues = packet.values || [];
  const sharedRoleEntries = roleConfigs
    .filter((role) => role.scope === "shared" || packet.mode === "collaborative")
    .map<SigningEntryRecord | null>((role) => {
      const roleValues = packetValues.filter(
        (value) => value.roleName === role.name && !value.copyId,
      );
      if (roleValues.length === 0) return null;
      const valuesMap = Object.fromEntries(
        roleValues.map((value) => [value.fieldId, value.value]),
      );
      const firstValue = roleValues[0];
      const lastUpdated = roleValues.reduce<number>(
        (latest, value) =>
          Math.max(latest, new Date(value.updatedAt || value.createdAt).getTime()),
        packet.completedAt ? new Date(packet.completedAt).getTime() : new Date(packet.createdAt).getTime(),
      );

      return {
        id: `packet-${packet.id}-${role.name}`,
        artifactKind: "packet",
        packetId: packet.id,
        documentId: String(document.id || ""),
        status: areRoleFieldsComplete(documentFields, role.name, valuesMap)
          ? "completed"
          : "pending",
        finalizedFileUrl: packet.finalizedFileUrl || null,
        finalizedStorageKey: packet.finalizedStorageKey || null,
        verificationId:
          document.verifications?.find(
            (item) => item.artifactType === "packet" && item.artifactId === packet.id,
          )?.id || null,
        signerName: firstValue?.signerName || null,
        signerEmail: firstValue?.signerEmail || null,
        signerRole: role.name,
        createdAt: firstValue?.createdAt || packet.createdAt,
        completedAt:
          areRoleFieldsComplete(documentFields, role.name, valuesMap)
            ? new Date(lastUpdated)
            : null,
      } satisfies SigningEntryRecord;
    })
    .filter(Boolean) as SigningEntryRecord[];

  const copyEntries = (packet.copies || []).filter((copy) => !copy.deletedAt).map((copy) => ({
    id: copy.id,
    artifactKind: "copy" as const,
    packetId: packet.id,
    documentId: String(document.id || ""),
    status: copy.status === "completed" ? "completed" : "pending",
    finalizedFileUrl: copy.finalizedFileUrl || null,
    finalizedStorageKey: copy.finalizedStorageKey || null,
    signerName: copy.signerName || null,
    signerEmail: copy.signerEmail || null,
    signerRole: copy.roleName,
    createdAt: copy.createdAt,
    completedAt: copy.completedAt || null,
    verificationId:
      document.verifications?.find(
        (item) =>
          (item.artifactType === "copy" || item.artifactType === "session") &&
          item.artifactId === copy.id,
      )?.id || null,
  }) satisfies SigningEntryRecord);

  return [...sharedRoleEntries, ...copyEntries];
}

function getSigningEntryTimestamp(entry: SigningEntryRecord) {
	return new Date(entry.completedAt || entry.createdAt).getTime();
}

function serializeDocumentActivity<T extends DocumentWithActivity>(
  document: T,
): Omit<T, "packets"> & {
  signingEntries: SigningEntryRecord[];
  packets: PacketActivitySummary[];
} {
  const { packets: _rawPackets, ...rest } = document;
  return {
    ...(rest as Omit<T, "packets">),
    signingEntries: buildSigningEntries(document),
    packets: buildPacketSummaries(document),
  };
}

export { buildSigningEntries, serializeDocumentActivity };
