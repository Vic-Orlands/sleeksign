import crypto from "crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";

import { db } from "@/db";
import {
  signerVerificationChallenges,
  signingPacketCopies,
  signingPackets,
} from "@/db/schema";
import { getOrganizationBranding, getWorkspaceBaseUrl } from "@/lib/branding";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import { buildSignerOtpEmail } from "@/lib/email/messages";
import { sendTransactionalEmail } from "@/lib/email/send-email";

const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

function hashValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function generateOtpCode() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

function getCookieName(packetId: string, roleName: string, copyId?: string | null) {
  return `sleeksign-otp-${packetId}-${roleName}${copyId ? `-${copyId}` : ""}`;
}

export async function createOtpChallenge(input: {
  packetId: string;
  copyId?: string | null;
  roleName: string;
  recipientEmail: string;
  requestHeaders: Headers;
}) {
  const packet = await db.query.signingPackets.findFirst({
    where: eq(signingPackets.id, input.packetId),
  });

  if (!packet) {
    throw new Error("Packet not found");
  }

  const code = generateOtpCode();
  const token = nanoid(32);
  const challengeId = nanoid();
  const branding = await getOrganizationBranding(packet.workspaceId);
  const baseUrl = getWorkspaceBaseUrl(
    branding,
    process.env.BETTER_AUTH_URL ||
      process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
      "http://localhost:3000",
  );

  await db.insert(signerVerificationChallenges).values({
    id: challengeId,
    organizationId: packet.workspaceId,
    teamId: packet.teamId,
    documentId: packet.documentId,
    packetId: packet.id,
    copyId: input.copyId || null,
    roleName: input.roleName,
    recipientEmail: input.recipientEmail,
    codeHash: hashValue(code),
    verificationToken: token,
    expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    lastSentAt: new Date(),
  });

  const email = buildSignerOtpEmail({
    code,
    roleName: input.roleName,
    baseUrl,
    branding,
  });

  await sendTransactionalEmail({
    to: input.recipientEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
    fromName: branding.senderName,
  });

  await emitAuditEvent({
    organizationId: packet.workspaceId,
    teamId: packet.teamId,
    workspaceId: packet.workspaceId,
    documentId: packet.documentId,
    packetId: packet.id,
    packetCopyId: input.copyId || null,
    actorType: "system",
    actorEmail: input.recipientEmail,
    eventType: "otp.sent",
    chainKey: input.copyId ? `packet-copy:${input.copyId}` : `packet:${packet.id}`,
    payload: {
      roleName: input.roleName,
      recipientEmail: input.recipientEmail,
    },
    ...getRequestAuditContext(input.requestHeaders),
  });

  return { challengeId, expiresInMinutes: OTP_TTL_MINUTES };
}

export async function verifyOtpChallenge(input: {
  packetId: string;
  copyId?: string | null;
  roleName: string;
  code: string;
  requestHeaders: Headers;
}) {
  const packet = await db.query.signingPackets.findFirst({
    where: eq(signingPackets.id, input.packetId),
  });

  if (!packet) {
    throw new Error("Packet not found");
  }

  const challenge = await db.query.signerVerificationChallenges.findFirst({
    where: and(
      eq(signerVerificationChallenges.packetId, input.packetId),
      eq(signerVerificationChallenges.roleName, input.roleName),
      input.copyId
        ? eq(signerVerificationChallenges.copyId, input.copyId)
        : isNull(signerVerificationChallenges.copyId),
    ),
    orderBy: [desc(signerVerificationChallenges.createdAt)],
  });

  if (!challenge) {
    throw new Error("OTP challenge not found");
  }

  if (challenge.verifiedAt) {
    return { success: true, email: challenge.recipientEmail };
  }

  if (challenge.attemptCount >= OTP_MAX_ATTEMPTS) {
    throw new Error("Too many invalid attempts");
  }

  if (challenge.expiresAt.getTime() < Date.now()) {
    throw new Error("OTP has expired");
  }

  const nextAttempts = challenge.attemptCount + 1;
  if (hashValue(input.code.trim()) !== challenge.codeHash) {
    await db
      .update(signerVerificationChallenges)
      .set({
        attemptCount: nextAttempts,
        updatedAt: new Date(),
      })
      .where(eq(signerVerificationChallenges.id, challenge.id));
    throw new Error("Invalid OTP");
  }

  await db
    .update(signerVerificationChallenges)
    .set({
      attemptCount: nextAttempts,
      verifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(signerVerificationChallenges.id, challenge.id));

  const cookieStore = await cookies();
  cookieStore.set(
    getCookieName(input.packetId, input.roleName, input.copyId),
    challenge.verificationToken || "",
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: OTP_TTL_MINUTES * 60,
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
    actorEmail: challenge.recipientEmail,
    eventType: "otp.verified",
    chainKey: input.copyId ? `packet-copy:${input.copyId}` : `packet:${packet.id}`,
    payload: {
      roleName: input.roleName,
      recipientEmail: challenge.recipientEmail,
    },
    ...getRequestAuditContext(input.requestHeaders),
  });

  return { success: true, email: challenge.recipientEmail };
}

export async function isOtpVerified(input: {
  packetId: string;
  copyId?: string | null;
  roleName: string;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(
    getCookieName(input.packetId, input.roleName, input.copyId),
  )?.value;

  if (!token) return false;

  const challenge = await db.query.signerVerificationChallenges.findFirst({
    where: and(
      eq(signerVerificationChallenges.packetId, input.packetId),
      eq(signerVerificationChallenges.roleName, input.roleName),
      input.copyId
        ? eq(signerVerificationChallenges.copyId, input.copyId)
        : isNull(signerVerificationChallenges.copyId),
    ),
    orderBy: [desc(signerVerificationChallenges.createdAt)],
  });

  return Boolean(
    challenge &&
      challenge.verifiedAt &&
      challenge.verificationToken === token &&
      challenge.expiresAt.getTime() >= Date.now(),
  );
}

export async function getOtpRecipientEmail(input: {
  packetId: string;
  copyId?: string | null;
}) {
  if (input.copyId) {
    const copy = await db.query.signingPacketCopies.findFirst({
      where: eq(signingPacketCopies.id, input.copyId),
    });
    return copy?.signerEmail || null;
  }

  const challenge = await db.query.signerVerificationChallenges.findFirst({
    where: eq(signerVerificationChallenges.packetId, input.packetId),
    orderBy: [desc(signerVerificationChallenges.createdAt)],
  });

  return challenge?.recipientEmail || null;
}
