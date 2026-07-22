import { and, desc, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getRequestEvent } from "$app/server";

import { db } from "@/db";
import {
  signerVerificationChallenges,
  signingPacketCopies,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import { getVerifiedOtpIdentity } from "@/lib/signer-otp";
import { getPacket } from "@/lib/signing-workflows";

const IDENTITY_TTL_SECONDS = 7 * 24 * 60 * 60;

export type SignerIdentity = {
  name: string;
  email: string;
};

function getIdentityCookieName(
  packetId: string,
  roleName: string,
  copyId?: string | null,
) {
  return `sleeksign-identity-${packetId}-${roleName}${copyId ? `-${copyId}` : ""}`;
}

export function parseSignerIdentity(input: {
  name?: unknown;
  email?: unknown;
}): SignerIdentity {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";

  if (name.length < 2 || name.length > 120) {
    throw new Error("Enter your full name");
  }
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error("Enter a valid email address");
  }

  return { name, email };
}

export async function establishSignerIdentity(input: {
  packetId: string;
  copyId?: string | null;
  roleName: string;
  name: string;
  email: string;
  requestHeaders: Headers;
}) {
  const identity = parseSignerIdentity(input);
  const packet = await getPacket(input.packetId);
  const role = packet.roleConfigs.find((item) => item.name === input.roleName);
  if (!role) throw new Error("Signer role not found");
  const privateRole =
    packet.mode === "individual" ||
    (packet.mode !== "collaborative" && role.scope === "private");
  if (privateRole && !input.copyId) {
    throw new Error("Signing invitation not found");
  }

  if (input.copyId) {
    const copy = await db.query.signingPacketCopies.findFirst({
      where: and(
        eq(signingPacketCopies.id, input.copyId),
        isNull(signingPacketCopies.deletedAt),
      ),
    });
    if (
      !copy ||
      copy.packetId !== packet.id ||
      copy.roleName !== input.roleName
    ) {
      throw new Error("Signing invitation not found");
    }
  }

  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + IDENTITY_TTL_SECONDS * 1000);

  await db.insert(signerVerificationChallenges).values({
    id: nanoid(),
    organizationId: packet.workspaceId,
    teamId: packet.teamId,
    documentId: packet.documentId,
    packetId: packet.id,
    copyId: input.copyId || null,
    roleName: input.roleName,
    signerName: identity.name,
    recipientEmail: identity.email,
    verificationMethod: "identity",
    codeHash: nanoid(32),
    verificationToken: token,
    verifiedAt: new Date(),
    expiresAt,
  });

  getRequestEvent().cookies.set(
    getIdentityCookieName(packet.id, input.roleName, input.copyId),
    token,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: IDENTITY_TTL_SECONDS,
    },
  );

  await emitAuditEvent({
    organizationId: packet.workspaceId,
    teamId: packet.teamId,
    workspaceId: packet.workspaceId,
    documentId: packet.documentId,
    packetId: packet.id,
    packetCopyId: input.copyId || null,
    actorType: "signer",
    actorEmail: identity.email,
    eventType: "signer.identified",
    chainKey: input.copyId
      ? `packet-copy:${input.copyId}`
      : `packet:${packet.id}`,
    payload: {
      roleName: input.roleName,
      signerName: identity.name,
      signerEmail: identity.email,
    },
    ...getRequestAuditContext(input.requestHeaders),
  });

  return identity;
}

async function getClaimedIdentity(input: {
  packetId: string;
  copyId?: string | null;
  roleName: string;
}) {
  const token = getRequestEvent().cookies.get(
    getIdentityCookieName(input.packetId, input.roleName, input.copyId),
  );
  if (!token) return null;

  const challenge = await db.query.signerVerificationChallenges.findFirst({
    where: and(
      eq(signerVerificationChallenges.packetId, input.packetId),
      eq(signerVerificationChallenges.roleName, input.roleName),
      eq(signerVerificationChallenges.verificationMethod, "identity"),
      input.copyId
        ? eq(signerVerificationChallenges.copyId, input.copyId)
        : isNull(signerVerificationChallenges.copyId),
    ),
    orderBy: [desc(signerVerificationChallenges.createdAt)],
  });

  if (
    !challenge?.verifiedAt ||
    challenge.verificationToken !== token ||
    challenge.expiresAt.getTime() < Date.now()
  ) {
    return null;
  }

  return parseSignerIdentity({
    name: challenge.signerName,
    email: challenge.recipientEmail,
  });
}

export async function resolvePacketSignerIdentity(input: {
  packetId: string;
  copyId?: string | null;
  roleName: string;
  requestHeaders: Headers;
}) {
  if (input.copyId) {
    const copy = await db.query.signingPacketCopies.findFirst({
      where: and(
        eq(signingPacketCopies.id, input.copyId),
        isNull(signingPacketCopies.deletedAt),
      ),
    });
    if (
      !copy ||
      copy.packetId !== input.packetId ||
      copy.roleName !== input.roleName
    ) {
      return null;
    }
    if (copy.signerName && copy.signerEmail) {
      return parseSignerIdentity({
        name: copy.signerName,
        email: copy.signerEmail,
      });
    }
  }

  const accountSession = await auth.api
    .getSession({ headers: input.requestHeaders })
    .catch(() => null);
  if (accountSession?.user.name && accountSession.user.email) {
    return parseSignerIdentity({
      name: accountSession.user.name,
      email: accountSession.user.email,
    });
  }

  return (
    (await getClaimedIdentity(input)) ||
    (await getVerifiedOtpIdentity(input))
  );
}
