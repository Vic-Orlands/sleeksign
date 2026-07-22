import { resolveTxt } from "node:dns/promises";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "@/db";
import { customDomains, organizationBranding } from "@/db/schema";

export type BrandingTokenSet = {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  neutralColor: string;
  accentColor: string;
  bodyFont: string;
  signatureFont: string;
  senderName: string;
  supportEmail: string | null;
  supportLabel: string;
  domain: string | null;
};

const DEFAULT_BRANDING: BrandingTokenSet = {
  logoUrl: null,
  primaryColor: "#18181b",
  secondaryColor: "#f4f4f5",
  neutralColor: "#fafafa",
  accentColor: "#71717a",
  bodyFont: "Public Sans",
  signatureFont: "Ruthie",
  senderName: "SleekSign",
  supportEmail: null,
  supportLabel: "Support",
  domain: null,
};

export async function getOrganizationBranding(workspaceId: string) {
  const [branding, verifiedDomain] = await Promise.all([
    db.query.organizationBranding.findFirst({
      where: eq(organizationBranding.organizationId, workspaceId),
    }),
    db.query.customDomains.findFirst({
      where: and(
        eq(customDomains.organizationId, workspaceId),
        eq(customDomains.status, "verified"),
      ),
      orderBy: [desc(customDomains.updatedAt)],
    }),
  ]);

  return {
    ...DEFAULT_BRANDING,
    ...(branding
      ? {
          logoUrl: branding.logoUrl,
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
          neutralColor: branding.neutralColor,
          accentColor: branding.accentColor,
          bodyFont: branding.bodyFont,
          signatureFont: branding.signatureFont,
          senderName: branding.senderName,
          supportEmail: branding.supportEmail,
          supportLabel: branding.supportLabel,
        }
      : {}),
    domain: verifiedDomain?.hostname || null,
  } satisfies BrandingTokenSet;
}

export async function upsertOrganizationBranding(
  workspaceId: string,
  input: Partial<BrandingTokenSet>,
) {
  const existing = await db.query.organizationBranding.findFirst({
    where: eq(organizationBranding.organizationId, workspaceId),
  });

  if (existing) {
    await db
      .update(organizationBranding)
      .set({
        logoUrl: input.logoUrl ?? existing.logoUrl,
        primaryColor: input.primaryColor ?? existing.primaryColor,
        secondaryColor: input.secondaryColor ?? existing.secondaryColor,
        neutralColor: input.neutralColor ?? existing.neutralColor,
        accentColor: input.accentColor ?? existing.accentColor,
        bodyFont: input.bodyFont ?? existing.bodyFont,
        signatureFont: input.signatureFont ?? existing.signatureFont,
        senderName: input.senderName ?? existing.senderName,
        supportEmail: input.supportEmail ?? existing.supportEmail,
        supportLabel: input.supportLabel ?? existing.supportLabel,
        updatedAt: new Date(),
      })
      .where(eq(organizationBranding.id, existing.id));
    return existing.id;
  }

  const id = nanoid();
  await db.insert(organizationBranding).values({
    id,
    organizationId: workspaceId,
    logoUrl: input.logoUrl ?? null,
    primaryColor: input.primaryColor ?? DEFAULT_BRANDING.primaryColor,
    secondaryColor: input.secondaryColor ?? DEFAULT_BRANDING.secondaryColor,
    neutralColor: input.neutralColor ?? DEFAULT_BRANDING.neutralColor,
    accentColor: input.accentColor ?? DEFAULT_BRANDING.accentColor,
    bodyFont: input.bodyFont ?? DEFAULT_BRANDING.bodyFont,
    signatureFont: input.signatureFont ?? DEFAULT_BRANDING.signatureFont,
    senderName: input.senderName ?? DEFAULT_BRANDING.senderName,
    supportEmail: input.supportEmail ?? null,
    supportLabel: input.supportLabel ?? DEFAULT_BRANDING.supportLabel,
  });

  return id;
}

export async function createOrUpdateCustomDomain(
  workspaceId: string,
  hostname: string,
) {
  const normalizedHost = hostname.trim().toLowerCase().replace(/\.$/, "");
  const labels = normalizedHost.split(".");
  const validHostname =
    normalizedHost.length <= 253 &&
    labels.length >= 2 &&
    labels.every(
      (label) =>
        label.length <= 63 &&
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
    );
  if (!validHostname) {
    throw new Error("Enter a valid hostname such as sign.company.com");
  }

  const existing = await db.query.customDomains.findFirst({
    where: and(
      eq(customDomains.organizationId, workspaceId),
      eq(customDomains.hostname, normalizedHost),
    ),
  });

  const verificationToken = `sleeksign-${nanoid(10).toLowerCase()}`;

  if (existing) {
    await db
      .update(customDomains)
      .set({
        hostname: normalizedHost,
        status: "pending",
        verificationToken,
        verifiedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(customDomains.id, existing.id));
    return { id: existing.id, hostname: normalizedHost, verificationToken };
  }

  const id = nanoid();
  await db.insert(customDomains).values({
    id,
    organizationId: workspaceId,
    hostname: normalizedHost,
    verificationToken,
  });

  return { id, hostname: normalizedHost, verificationToken };
}

export async function verifyCustomDomain(
  workspaceId: string,
  domainId: string,
) {
  const existing = await db.query.customDomains.findFirst({
    where: and(
      eq(customDomains.id, domainId),
      eq(customDomains.organizationId, workspaceId),
    ),
  });

  if (!existing) return null;

  let records: string[][];
  try {
    records = await resolveTxt(`_sleeksign.${existing.hostname}`);
  } catch {
    return null;
  }

  const verified = records.some(
    (chunks) => chunks.join("").trim() === existing.verificationToken,
  );
  if (!verified) return null;

  await db
    .update(customDomains)
    .set({
      status: "verified",
      verifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(customDomains.id, existing.id));

  return existing.id;
}

export function getWorkspaceBaseUrl(
  branding: BrandingTokenSet,
  baseUrl: string,
) {
  if (!branding.domain) {
    return baseUrl;
  }

  const protocol = baseUrl.startsWith("http://localhost") ? "http" : "https";
  return `${protocol}://${branding.domain}`;
}

export { DEFAULT_BRANDING };
