# Neon, Email, and Invitation Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move SleekSign to Neon Postgres, centralize transactional email rendering and delivery with one reusable HTML template system, and make pending invitation management hide canceled invites reliably.

**Architecture:** Replace the SQLite-specific Drizzle and Better Auth setup with a Postgres-backed Neon runtime, add a small internal mail layer that renders one shared branded HTML shell with dynamic content blocks, and normalize invitation data at the app boundary so the “Pending Invitations” view only renders actionable pending records. The migration is staged so runtime, schema, data transfer, and UI behavior can each be verified independently.

**Tech Stack:** Next.js App Router, Drizzle ORM, Better Auth, Neon Postgres, Resend, TypeScript

---

## File Structure

- **Modify:** `/Users/chimezie/Desktop/signage/package.json`
  - Add Neon/Postgres runtime dependencies and any Drizzle/Postgres helpers needed.
- **Modify:** `/Users/chimezie/Desktop/signage/src/db/index.ts`
  - Replace local SQLite initialization with Neon/Postgres client setup.
- **Modify:** `/Users/chimezie/Desktop/signage/src/db/schema.ts`
  - Convert Drizzle schema from SQLite definitions to Postgres definitions.
- **Modify:** `/Users/chimezie/Desktop/signage/drizzle.config.ts`
  - Switch Drizzle Kit configuration to Postgres and `DATABASE_URL`.
- **Modify:** `/Users/chimezie/Desktop/signage/src/lib/auth.ts`
  - Swap Better Auth adapter to Postgres and remove inline email HTML in favor of shared mail helpers.
- **Create:** `/Users/chimezie/Desktop/signage/src/lib/email/send-email.ts`
  - Own Resend initialization, config validation, delivery, and delivery error formatting.
- **Create:** `/Users/chimezie/Desktop/signage/src/lib/email/render-email.ts`
  - Render shared HTML and text templates using one SleekSign-branded shell.
- **Create:** `/Users/chimezie/Desktop/signage/src/lib/email/messages.ts`
  - Build typed dynamic payloads for reset-password and invitation emails.
- **Create:** `/Users/chimezie/Desktop/signage/scripts/migrate-sqlite-to-neon.ts`
  - One-off importer from local SQLite data into Neon Postgres.
- **Modify:** `/Users/chimezie/Desktop/signage/src/components/hr/hr-shell.tsx`
  - Filter invitation lists to pending records only and keep optimistic cancel behavior aligned with refetches.
- **Create or Modify:** `/Users/chimezie/Desktop/signage/drizzle/*.sql`
  - Generate Postgres migrations from the new schema.

---

### Task 1: Add Postgres Runtime Dependencies

**Files:**
- Modify: `/Users/chimezie/Desktop/signage/package.json`
- Test: `/Users/chimezie/Desktop/signage/package-lock.json`

- [ ] **Step 1: Add the required Postgres dependencies**

Update the dependencies block to include Neon/Postgres packages alongside the existing stack:

```json
{
  "dependencies": {
    "@neondatabase/serverless": "^0.10.4",
    "pg": "^8.13.1",
    "dotenv": "^16.4.7"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: install completes and updates `package-lock.json`

- [ ] **Step 3: Verify dependency presence**

Run: `rg -n "\"@neondatabase/serverless\"|\"pg\"|\"dotenv\"" package.json package-lock.json`

Expected: all three packages appear in both files

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add neon postgres runtime dependencies"
```

---

### Task 2: Move Drizzle Runtime from SQLite to Neon Postgres

**Files:**
- Modify: `/Users/chimezie/Desktop/signage/src/db/index.ts`
- Test: `/Users/chimezie/Desktop/signage/src/db/index.ts`

- [ ] **Step 1: Replace the SQLite runtime with a Neon-backed Drizzle setup**

Replace the file body with:

```ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

const sql = neon(databaseUrl);

export const db = drizzle(sql, { schema });
```

- [ ] **Step 2: Verify imports are SQLite-free**

Run: `rg -n "better-sqlite3|sqlite.db|pragma|drizzle-orm/better-sqlite3" src/db/index.ts`

Expected: no matches

- [ ] **Step 3: Commit**

```bash
git add src/db/index.ts
git commit -m "refactor: switch drizzle runtime to neon postgres"
```

---

### Task 3: Convert the Drizzle Schema from SQLite to Postgres

**Files:**
- Modify: `/Users/chimezie/Desktop/signage/src/db/schema.ts`
- Test: `/Users/chimezie/Desktop/signage/src/db/schema.ts`

- [ ] **Step 1: Convert schema imports to Postgres helpers**

Replace the top import with:

```ts
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
```

- [ ] **Step 2: Convert table declarations from `sqliteTable` to `pgTable`**

Use this pattern consistently:

```ts
export const documents = pgTable("documents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  fileUrl: text("file_url").notNull(),
  workspaceId: text("workspace_id"),
  signerRoles: text("signer_roles").notNull().default('["HR","Employee","Contractor"]'),
  roleConfigs: text("role_configs")
    .notNull()
    .default('[{"name":"HR","scope":"private"},{"name":"Employee","scope":"private"},{"name":"Contractor","scope":"private"}]'),
  isTemplate: boolean("is_template").notNull().default(false),
  archivedAt: timestamp("archived_at", { withTimezone: false }),
  deletedAt: timestamp("deleted_at", { withTimezone: false }),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
});
```

- [ ] **Step 3: Convert boolean and timestamp columns throughout the schema**

Follow this pattern:

```ts
required: boolean("required").notNull().default(true),
completedAt: timestamp("completed_at", { withTimezone: false }),
createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
```

- [ ] **Step 4: Keep enum-like text columns as text with app-level constraints**

Use patterns like:

```ts
status: text("status").notNull().default("pending"),
type: text("type").notNull(),
```

This avoids unnecessary Postgres enum churn during migration.

- [ ] **Step 5: Run TypeScript and Drizzle validation through lint/build later, but immediately scan for SQLite-specific syntax**

Run: `rg -n "sqliteTable|mode: \"boolean\"|mode: \"timestamp\"|drizzle-orm/sqlite-core" src/db/schema.ts`

Expected: no matches

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts
git commit -m "refactor: convert drizzle schema to postgres"
```

---

### Task 4: Update Drizzle Config for Neon Postgres

**Files:**
- Modify: `/Users/chimezie/Desktop/signage/drizzle.config.ts`
- Test: `/Users/chimezie/Desktop/signage/drizzle.config.ts`

- [ ] **Step 1: Replace the SQLite Drizzle config**

Update the file to:

```ts
import "dotenv/config";
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

- [ ] **Step 2: Verify old SQLite config is gone**

Run: `rg -n "sqlite|sqlite.db" drizzle.config.ts`

Expected: no matches

- [ ] **Step 3: Commit**

```bash
git add drizzle.config.ts
git commit -m "chore: configure drizzle for neon postgres"
```

---

### Task 5: Switch Better Auth to Postgres

**Files:**
- Modify: `/Users/chimezie/Desktop/signage/src/lib/auth.ts`
- Test: `/Users/chimezie/Desktop/signage/src/lib/auth.ts`

- [ ] **Step 1: Update the Better Auth adapter provider**

Change:

```ts
provider: "sqlite",
```

To:

```ts
provider: "pg",
```

- [ ] **Step 2: Remove inline email rendering responsibilities from `auth.ts` but keep auth wiring intact**

Replace local email rendering calls with imports that will be introduced in later tasks:

```ts
import { sendTransactionalEmail } from "@/lib/email/send-email";
import {
  buildInvitationEmail,
  buildResetPasswordEmail,
} from "@/lib/email/messages";
```

- [ ] **Step 3: Update reset password send path to call the shared builder**

Use:

```ts
const message = buildResetPasswordEmail({ url, userName: user.name });
await sendTransactionalEmail({
  to: user.email,
  subject: message.subject,
  html: message.html,
  text: message.text,
});
```

- [ ] **Step 4: Update invitation send path to call the shared builder**

Use:

```ts
const message = buildInvitationEmail({
  inviteUrl: url,
  organizationName: organization.name,
  inviterName: inviter.user.name,
});

await sendTransactionalEmail({
  to: email,
  subject: message.subject,
  html: message.html,
  text: message.text,
});
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts
git commit -m "refactor: connect better auth email hooks to shared mailer"
```

---

### Task 6: Build the Shared Resend Mailer

**Files:**
- Create: `/Users/chimezie/Desktop/signage/src/lib/email/send-email.ts`
- Test: `/Users/chimezie/Desktop/signage/src/lib/email/send-email.ts`

- [ ] **Step 1: Create the delivery helper**

Create the file with:

```ts
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

type SendTransactionalEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendTransactionalEmail({
  to,
  subject,
  html,
  text,
}: SendTransactionalEmailInput) {
  const from = process.env.RESEND_FROM_EMAIL;

  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is not configured");
  }

  const response = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
  });

  if (response.error) {
    throw new Error(
      `Resend email delivery failed: ${response.error.message}`,
    );
  }

  return response;
}
```

- [ ] **Step 2: Verify no auth-specific assumptions leaked into the mailer**

Run: `rg -n "invite|reset|organization|password" src/lib/email/send-email.ts`

Expected: no matches other than generic type names

- [ ] **Step 3: Commit**

```bash
git add src/lib/email/send-email.ts
git commit -m "feat: add shared resend delivery helper"
```

---

### Task 7: Build the Shared HTML Email Renderer

**Files:**
- Create: `/Users/chimezie/Desktop/signage/src/lib/email/render-email.ts`
- Test: `/Users/chimezie/Desktop/signage/src/lib/email/render-email.ts`

- [ ] **Step 1: Create a shared branded email shell**

Create the file with:

```ts
type RenderEmailInput = {
  preheader: string;
  eyebrow: string;
  headline: string;
  body: string[];
  ctaLabel: string;
  ctaUrl: string;
  supportNote: string;
};

export function renderEmailHtml({
  preheader,
  eyebrow,
  headline,
  body,
  ctaLabel,
  ctaUrl,
  supportNote,
}: RenderEmailInput) {
  const paragraphs = body
    .map(
      (line) =>
        `<p style="margin:0 0 14px;font-family:Roboto,Arial,sans-serif;font-size:15px;line-height:1.7;color:#52525b;">${line}</p>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SleekSign</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&family=Ruthie&display=swap" rel="stylesheet">
  </head>
  <body style="margin:0;background:#f7f5f1;padding:24px 12px;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border-collapse:collapse;">
            <tr>
              <td style="padding:0 0 18px 0;">
                <span style="display:inline-block;background:#f97316;color:#fff;padding:8px 14px;border-radius:999px;font-family:Roboto,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">SleekSign</span>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;border-radius:28px;padding:36px 32px;box-shadow:0 12px 40px rgba(0,0,0,0.06);">
                <p style="margin:0 0 16px;font-family:Roboto,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:#f97316;">${eyebrow}</p>
                <h1 style="margin:0 0 18px;font-family:Roboto,Arial,sans-serif;font-size:32px;line-height:1.05;color:#18181b;">${headline}</h1>
                ${paragraphs}
                <div style="padding-top:8px;padding-bottom:18px;">
                  <a href="${ctaUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:999px;font-family:Roboto,Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;">${ctaLabel}</a>
                </div>
                <p style="margin:0;font-family:Roboto,Arial,sans-serif;font-size:13px;line-height:1.7;color:#71717a;">${supportNote}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 8px 0 8px;text-align:center;">
                <p style="margin:0;font-family:Roboto,Arial,sans-serif;font-size:12px;line-height:1.6;color:#a1a1aa;">Sent from your SleekSign workspace.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderEmailText({
  headline,
  body,
  ctaLabel,
  ctaUrl,
  supportNote,
}: Omit<RenderEmailInput, "preheader" | "eyebrow">) {
  return [headline, "", ...body, "", `${ctaLabel}: ${ctaUrl}`, "", supportNote].join("\n");
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/email/render-email.ts
git commit -m "feat: add shared sleeksign email renderer"
```

---

### Task 8: Build Typed Dynamic Email Messages

**Files:**
- Create: `/Users/chimezie/Desktop/signage/src/lib/email/messages.ts`
- Test: `/Users/chimezie/Desktop/signage/src/lib/email/messages.ts`

- [ ] **Step 1: Create message builders for reset-password and invitation**

Create the file with:

```ts
import { renderEmailHtml, renderEmailText } from "./render-email";

export function buildResetPasswordEmail({
  url,
  userName,
}: {
  url: string;
  userName?: string | null;
}) {
  const body = [
    userName
      ? `Hi ${userName}, we received a request to reset your SleekSign password.`
      : "We received a request to reset your SleekSign password.",
    "Use the button below to choose a new password and return to your workspace.",
    "If you did not request this change, you can safely ignore this email.",
  ];

  const subject = "Reset your SleekSign password";

  return {
    subject,
    html: renderEmailHtml({
      preheader: subject,
      eyebrow: "Password reset",
      headline: "Reset your password",
      body,
      ctaLabel: "Reset Password",
      ctaUrl: url,
      supportNote: "This link opens the secure password reset flow for your SleekSign account.",
    }),
    text: renderEmailText({
      headline: "Reset your password",
      body,
      ctaLabel: "Reset Password",
      ctaUrl: url,
      supportNote: "This link opens the secure password reset flow for your SleekSign account.",
    }),
  };
}

export function buildInvitationEmail({
  inviteUrl,
  organizationName,
  inviterName,
}: {
  inviteUrl: string;
  organizationName: string;
  inviterName?: string | null;
}) {
  const inviterLine = inviterName
    ? `${inviterName} invited you to join ${organizationName} on SleekSign.`
    : `You have been invited to join ${organizationName} on SleekSign.`;

  const body = [
    inviterLine,
    "Open the invitation to access the workspace and start collaborating on documents, packets, and signer activity.",
    "If you were not expecting this invitation, you can ignore this email.",
  ];

  const subject = `Join ${organizationName} on SleekSign`;

  return {
    subject,
    html: renderEmailHtml({
      preheader: subject,
      eyebrow: "Workspace invitation",
      headline: `Join ${organizationName}`,
      body,
      ctaLabel: "Accept Invitation",
      ctaUrl: inviteUrl,
      supportNote: "This button opens the invitation acceptance flow for your SleekSign workspace.",
    }),
    text: renderEmailText({
      headline: `Join ${organizationName}`,
      body,
      ctaLabel: "Accept Invitation",
      ctaUrl: inviteUrl,
      supportNote: "This button opens the invitation acceptance flow for your SleekSign workspace.",
    }),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/email/messages.ts
git commit -m "feat: add typed transactional email message builders"
```

---

### Task 9: Filter Pending Invitations in the Workspace UI

**Files:**
- Modify: `/Users/chimezie/Desktop/signage/src/components/hr/hr-shell.tsx`
- Test: `/Users/chimezie/Desktop/signage/src/components/hr/hr-shell.tsx`

- [ ] **Step 1: Normalize fetched invitation data to pending-only**

In the workspace data loader, replace:

```ts
invitations: Array.isArray(invitationData) ? invitationData : [],
```

With:

```ts
invitations: Array.isArray(invitationData)
  ? invitationData.filter((invitation) => invitation.status === "pending")
  : [],
```

- [ ] **Step 2: Keep local refresh behavior aligned**

If any local setter assigns invitation data from a fresh fetch result, normalize there too:

```ts
setInvitations(
  (data.invitations || []).filter(
    (invitation) => invitation.status === "pending",
  ),
);
```

- [ ] **Step 3: Keep optimistic cancel removal unchanged**

The existing optimistic cancel is already correct:

```ts
setInvitations((current) =>
  current.filter((item) => item.id !== invitationId),
);
```

Do not reintroduce canceled items from refetches.

- [ ] **Step 4: Commit**

```bash
git add src/components/hr/hr-shell.tsx
git commit -m "fix: keep pending invitation list free of canceled invites"
```

---

### Task 10: Generate Postgres Migrations

**Files:**
- Modify/Create: `/Users/chimezie/Desktop/signage/drizzle/*`
- Test: `/Users/chimezie/Desktop/signage/drizzle/*`

- [ ] **Step 1: Create a `.env.local` or shell environment with `DATABASE_URL` pointing at Neon**

Run: `printenv DATABASE_URL`

Expected: prints the Neon connection string, not blank

- [ ] **Step 2: Generate the new Drizzle migration**

Run: `npx drizzle-kit generate`

Expected: new migration files appear under `drizzle/`

- [ ] **Step 3: Inspect generated SQL for key tables**

Run: `rg -n "create table|documents|fields|sessions|signing_packets|invitation" drizzle`

Expected: Postgres SQL exists for the main app and auth tables

- [ ] **Step 4: Commit**

```bash
git add drizzle
git commit -m "chore: generate postgres drizzle migrations"
```

---

### Task 11: Build the SQLite-to-Neon Migration Script

**Files:**
- Create: `/Users/chimezie/Desktop/signage/scripts/migrate-sqlite-to-neon.ts`
- Test: `/Users/chimezie/Desktop/signage/scripts/migrate-sqlite-to-neon.ts`

- [ ] **Step 1: Create a one-off migration script shell**

Create the file with:

```ts
import "dotenv/config";
import Database from "better-sqlite3";
import { neon } from "@neondatabase/serverless";

const sqlite = new Database("sqlite.db", { readonly: true });
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

const sql = neon(databaseUrl);

async function main() {
  const users = sqlite.prepare("select * from user").all();
  console.log(`Found ${users.length} users in sqlite`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Expand the script table-by-table in dependency order**

Implement inserts in this order:

1. `user`
2. `organization`
3. `member`
4. `invitation`
5. `documents`
6. `fields`
7. `sessions`
8. `signatures`
9. `signing_packets`
10. `signing_packet_copies`
11. `signing_packet_values`
12. `account`
13. `session`
14. `verification`

Use explicit inserts like:

```ts
await sql`
  insert into "user" ("id", "name", "email", "email_verified", "image", "last_workspace_id", "created_at", "updated_at")
  values (${row.id}, ${row.name}, ${row.email}, ${row.emailVerified}, ${row.image}, ${row.lastWorkspaceId}, ${row.createdAt}, ${row.updatedAt})
  on conflict ("id") do nothing
`;
```

- [ ] **Step 3: Add row-count logging per table**

Use:

```ts
console.log(`Migrated ${rows.length} rows from ${tableName}`);
```

- [ ] **Step 4: Dry-run the script against local data**

Run: `node --import tsx scripts/migrate-sqlite-to-neon.ts`

Expected: completes with row-count logs and no foreign-key errors

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate-sqlite-to-neon.ts
git commit -m "feat: add sqlite to neon migration script"
```

---

### Task 12: Full Verification

**Files:**
- Modify if needed: `/Users/chimezie/Desktop/signage/.env.local`
- Test: app runtime and auth/email/invitation behavior

- [ ] **Step 1: Run lint**

Run: `npm run lint`

Expected: exits 0

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: exits 0

- [ ] **Step 3: Verify forgot-password email**

Manual flow:

1. Open `/forgot-password`
2. Submit a real test email
3. Confirm mail arrives with SleekSign branding, shared structure, and reset CTA

Expected: email delivered and layout matches the shared template

- [ ] **Step 4: Verify invitation email**

Manual flow:

1. Invite a member from workspace settings
2. Confirm the message arrives
3. Confirm the HTML shell matches reset-password email while content differs

Expected: shared layout, invitation-specific copy

- [ ] **Step 5: Verify invitation cancellation cleanup**

Manual flow:

1. Send an invite
2. Confirm it appears under Pending Invitations
3. Cancel it
4. Refresh the page

Expected: canceled invite does not reappear in Pending Invitations

- [ ] **Step 6: Verify Neon-backed app behavior**

Manual flow:

1. Sign in
2. Open documents dashboard
3. Open a document
4. Trigger a packet workflow

Expected: core routes still load and write correctly against Neon

- [ ] **Step 7: Commit final integration**

```bash
git add src/db/index.ts src/db/schema.ts drizzle.config.ts src/lib/auth.ts src/lib/email src/components/hr/hr-shell.ts drizzle scripts package.json package-lock.json
git commit -m "feat: migrate to neon and unify transactional emails"
```

---

## Self-Review

- **Spec coverage:** This plan covers the Neon runtime switch, Drizzle dialect migration, Better Auth provider update, one-time data migration, reusable email rendering, Resend delivery handling, and pending invitation filtering.
- **Placeholder scan:** No `TODO`, `TBD`, or “implement later” placeholders remain.
- **Type consistency:** Shared mail helpers use `sendTransactionalEmail`, `renderEmailHtml`, `renderEmailText`, `buildResetPasswordEmail`, and `buildInvitationEmail` consistently across tasks.

## Execution Handoff

**Plan complete and saved to `/Users/chimezie/Desktop/signage/docs/superpowers/plans/2026-05-23-neon-email-invitations.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
