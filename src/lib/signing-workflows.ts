import { and, eq, isNull, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "@/db";
import {
  documents,
  fields,
  signingPacketCopies,
  signingPackets,
  signingPacketValues,
} from "@/db/schema";
import type { Field, RoleConfig, WorkflowMode } from "@/lib/field-utils";
import {
  deriveSignerRoles,
  getVisibleRoles,
  isSharedRole,
  parseRoleConfigs,
  parseSignerRoles,
  type RoleScope,
} from "@/lib/field-utils";

type PacketValueRecord = typeof signingPacketValues.$inferSelect;

function serializeDocumentForWorkflow(
  document: typeof documents.$inferSelect & {
    fields?: typeof fields.$inferSelect[];
  },
) {
  const roleConfigs = parseRoleConfigs(document.roleConfigs);

  return {
    ...document,
    signerRoles: parseSignerRoles(document.signerRoles),
    roleConfigs,
    fields: (document.fields || []).map((field) => ({
      ...field,
      assigneeRole:
        field.assigneeRole === "HR" ? "Owner" : field.assigneeRole || "",
    })),
  };
}

async function createSigningPacket(
  documentId: string,
  mode: WorkflowMode,
  roleConfigs: RoleConfig[],
  options: {
    workspaceId: string;
    teamId?: string | null;
    requireOtp?: boolean;
  },
) {
  const packetId = nanoid();

  await db.insert(signingPackets).values({
    id: packetId,
    documentId,
    workspaceId: options.workspaceId,
    teamId: options.teamId || null,
    mode,
    roleConfigs: JSON.stringify(roleConfigs),
    requireOtp: options.requireOtp ?? false,
  });

  return packetId;
}

async function createPacketCopy(input: {
  packetId: string;
  roleName: string;
  signerName?: string;
  signerEmail?: string;
  teamId?: string | null;
  bulkSendJobId?: string | null;
  bulkSendRowId?: string | null;
  recipientType?: "email" | "signer" | "group" | "bulk";
  recipientSourceId?: string | null;
}) {
  const copyId = nanoid();

  await db.insert(signingPacketCopies).values({
    id: copyId,
    packetId: input.packetId,
    teamId: input.teamId || null,
    roleName: input.roleName,
    signerName: input.signerName || null,
    signerEmail: input.signerEmail || null,
    recipientType: input.recipientType || "email",
    recipientSourceId: input.recipientSourceId || null,
    bulkSendJobId: input.bulkSendJobId || null,
    bulkSendRowId: input.bulkSendRowId || null,
  });

  return copyId;
}

async function getPacket(packetId: string) {
  const packet = await db.query.signingPackets.findFirst({
    where: and(eq(signingPackets.id, packetId), isNull(signingPackets.deletedAt)),
    with: {
      document: {
        with: {
          fields: true,
        },
      },
      copies: true,
      values: true,
    },
  });

  if (!packet?.document) {
    throw new Error("Packet not found");
  }

  const serializedDocument = serializeDocumentForWorkflow(packet.document);
  const roleConfigs = parseRoleConfigs(packet.roleConfigs);

  return {
    ...packet,
    copies: packet.copies.filter((copy) => !copy.deletedAt),
    mode: packet.mode as WorkflowMode,
    document: serializedDocument,
    roleConfigs,
  };
}

function getFieldValueMap(values: PacketValueRecord[]) {
  return Object.fromEntries(values.map((value) => [value.fieldId, value]));
}

function getVisibleFieldsForSigner(input: {
  fields: Field[];
  roleConfigs: RoleConfig[];
  mode: WorkflowMode;
  currentRole: string;
}) {
  const visibleRoles = new Set(
    getVisibleRoles(input.roleConfigs, input.mode, input.currentRole),
  );

  return input.fields.filter((field) => visibleRoles.has(field.assigneeRole));
}

function getMergedValuesForSigner(input: {
  packetValues: PacketValueRecord[];
  copyValues: PacketValueRecord[];
  fields: Field[];
  roleConfigs: RoleConfig[];
  mode: WorkflowMode;
}) {
  const sharedValues = getFieldValueMap(input.packetValues);
  const copyValues = getFieldValueMap(input.copyValues);
  const resolved: Record<string, string> = {};

  for (const field of input.fields) {
    const sharedRole = isSharedRole(
      input.roleConfigs,
      field.assigneeRole,
      input.mode,
    );
    const sourceValue =
      input.mode === "collaborative"
        ? sharedValues[field.id]
        : input.mode === "individual"
          ? copyValues[field.id]
          : sharedRole
            ? sharedValues[field.id]
            : copyValues[field.id];

    if (sourceValue?.value) {
      resolved[field.id] = sourceValue.value;
    }
  }

  return resolved;
}

function getRequiredFieldsForRole(fields: Field[], roleName: string) {
  return fields.filter(
    (field) => field.assigneeRole === roleName && field.required,
  );
}

function areRoleFieldsComplete(
  fields: Field[],
  roleName: string,
  values: Record<string, string>,
) {
  const requiredFields = getRequiredFieldsForRole(fields, roleName);

  return requiredFields.every((field) => Boolean(values[field.id] && values[field.id] !== "false"));
}

function getStorageScopeForRole(
  roleConfigs: RoleConfig[],
  roleName: string,
  mode: WorkflowMode,
): RoleScope {
  if (mode === "collaborative") return "shared";
  if (mode === "individual") return "private";
  return isSharedRole(roleConfigs, roleName, mode) ? "shared" : "private";
}

async function upsertPacketValue(input: {
  packetId: string;
  copyId?: string | null;
  fieldId: string;
  roleName: string;
  value: string;
  signerName?: string | null;
  signerEmail?: string | null;
}) {
  const valueId = nanoid();
  const [saved] = await db
    .insert(signingPacketValues)
    .values({
      id: valueId,
      packetId: input.packetId,
      copyId: input.copyId || null,
      fieldId: input.fieldId,
      roleName: input.roleName,
      value: input.value,
      signerName: input.signerName || null,
      signerEmail: input.signerEmail || null,
    })
    .onConflictDoUpdate({
      target: input.copyId
        ? [signingPacketValues.copyId, signingPacketValues.fieldId]
        : [signingPacketValues.packetId, signingPacketValues.fieldId],
      targetWhere: input.copyId
        ? sql`${signingPacketValues.copyId} is not null`
        : sql`${signingPacketValues.copyId} is null`,
      set: {
        roleName: input.roleName,
        value: input.value,
        signerName: input.signerName || null,
        signerEmail: input.signerEmail || null,
        updatedAt: new Date(),
      },
    })
    .returning({ id: signingPacketValues.id });

  return saved.id;
}

async function completePacketCopy(
  copyId: string,
  finalizedFileUrl?: string | null,
  finalizedStorageKey?: string | null,
) {
  await db
    .update(signingPacketCopies)
    .set({
      status: "completed",
      finalizedFileUrl: finalizedFileUrl || null,
      finalizedStorageKey: finalizedStorageKey || null,
      completedAt: new Date(),
    })
    .where(eq(signingPacketCopies.id, copyId));
}

async function completePacket(
  packetId: string,
  finalizedFileUrl?: string | null,
  finalizedStorageKey?: string | null,
) {
  await db
    .update(signingPackets)
    .set({
      status: "completed",
      finalizedFileUrl: finalizedFileUrl || null,
      finalizedStorageKey: finalizedStorageKey || null,
      completedAt: new Date(),
    })
    .where(eq(signingPackets.id, packetId));
}

export {
  areRoleFieldsComplete,
  completePacket,
  completePacketCopy,
  createPacketCopy,
  createSigningPacket,
  deriveSignerRoles,
  getMergedValuesForSigner,
  getPacket,
  getRequiredFieldsForRole,
  getStorageScopeForRole,
  getVisibleFieldsForSigner,
  serializeDocumentForWorkflow,
  upsertPacketValue,
};
