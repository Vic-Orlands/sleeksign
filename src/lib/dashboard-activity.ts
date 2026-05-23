import type { SessionRecord } from "@/components/hr/types";
import {
  fields,
  sessions,
  signingPacketCopies,
  signingPackets,
  signingPacketValues,
} from "@/db/schema";
import { areRoleFieldsComplete } from "@/lib/signing-workflows";
import { parseRoleConfigs } from "@/lib/field-utils";

type LegacySession = typeof sessions.$inferSelect;
type Packet = typeof signingPackets.$inferSelect & {
  copies?: Array<typeof signingPacketCopies.$inferSelect>;
  values?: Array<typeof signingPacketValues.$inferSelect>;
};
type DocumentWithActivity = {
  id?: string;
  fields?: Array<typeof fields.$inferSelect>;
  sessions?: LegacySession[];
  packets?: Packet[];
  [key: string]: unknown;
};

function buildDocumentSessions(document: DocumentWithActivity): SessionRecord[] {
  const legacySessions = (document.sessions || [])
    .filter((session) => !session.deletedAt)
    .map((session) => ({
      ...session,
      finalizedFileUrl: null,
      completedAt: session.completedAt || null,
      deletedAt: session.deletedAt || null,
    }));

  const packetSessions = (document.packets || []).flatMap((packet) =>
    buildPacketSessions(document, packet),
  );

  return [...legacySessions, ...packetSessions].sort(
    (left, right) => getSessionTimestamp(right) - getSessionTimestamp(left),
  );
}

function buildPacketSessions(
  document: DocumentWithActivity,
  packet: Packet,
): SessionRecord[] {
  const roleConfigs = parseRoleConfigs(packet.roleConfigs);
  const documentFields = (document.fields || []).map((field) => ({
    ...field,
    assigneeRole: field.assigneeRole || "",
  }));
  const packetValues = packet.values || [];
  const sharedRoleSessions = roleConfigs
    .filter((role) => role.scope === "shared" || packet.mode === "collaborative")
    .map<SessionRecord | null>((role) => {
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
        documentId: String(document.id || ""),
        status: areRoleFieldsComplete(documentFields, role.name, valuesMap)
          ? "completed"
          : "pending",
        finalizedFileUrl: packet.finalizedFileUrl || null,
        signerName: firstValue?.signerName || role.name,
        signerEmail: firstValue?.signerEmail || null,
        signerRole: role.name,
        createdAt: firstValue?.createdAt || packet.createdAt,
        completedAt:
          areRoleFieldsComplete(documentFields, role.name, valuesMap)
            ? new Date(lastUpdated)
            : null,
      } satisfies SessionRecord;
    })
    .filter(Boolean) as SessionRecord[];

  const copySessions = (packet.copies || []).map((copy) => ({
    id: copy.id,
    documentId: String(document.id || ""),
    status: copy.status === "completed" ? "completed" : "pending",
    finalizedFileUrl: copy.finalizedFileUrl || null,
    signerName: copy.signerName || copy.roleName,
    signerEmail: copy.signerEmail || null,
    signerRole: copy.roleName,
    createdAt: copy.createdAt,
    completedAt: copy.completedAt || null,
  }) satisfies SessionRecord);

  return [...sharedRoleSessions, ...copySessions];
}

function getSessionTimestamp(session: SessionRecord) {
  return new Date(session.completedAt || session.createdAt).getTime();
}

function serializeDocumentActivity<T extends DocumentWithActivity>(
  document: T,
): T & { sessions: SessionRecord[] } {
  return {
    ...document,
    sessions: buildDocumentSessions(document),
  };
}

export { buildDocumentSessions, serializeDocumentActivity };
