# Neon, Email, and Invitation Cleanup Design

## Goal

Move SleekSign from local SQLite to Neon Postgres for production readiness, replace inline auth email markup with one reusable app-level HTML email system powered by Resend, and make invitation cancellation behave like a true pending-list removal instead of surfacing canceled records in the same UI.

## Scope

This design covers three tightly related changes:

1. Database migration from `better-sqlite3` + Drizzle SQLite to Neon Postgres + Drizzle Postgres
2. Shared reusable HTML email template system for auth and workspace emails
3. Invitation UX cleanup so canceled invites stop appearing in the pending invitations list

This does not include broader observability dashboards, analytics, or a general-purpose email history system.

## Current State

### Database

- [src/db/index.ts](/Users/chimezie/Desktop/signage/src/db/index.ts) initializes a local `sqlite.db` file through `better-sqlite3`
- [drizzle.config.ts](/Users/chimezie/Desktop/signage/drizzle.config.ts) is configured for SQLite
- [src/db/schema.ts](/Users/chimezie/Desktop/signage/src/db/schema.ts) uses `drizzle-orm/sqlite-core`
- Better Auth is configured with `provider: "sqlite"` in [src/lib/auth.ts](/Users/chimezie/Desktop/signage/src/lib/auth.ts)

### Email

- All current auth/workspace email content lives inline in [src/lib/auth.ts](/Users/chimezie/Desktop/signage/src/lib/auth.ts)
- Resend is initialized there directly
- If `RESEND_API_KEY` or `RESEND_FROM_EMAIL` is missing, delivery is skipped and only logged to the console
- Reset password and invitation emails do not share a proper reusable frame

### Invitations

- The workspace settings UI loads invitations from Better Auth’s `/organization/list-invitations` route in [src/components/hr/hr-shell.tsx](/Users/chimezie/Desktop/signage/src/components/hr/hr-shell.tsx)
- Better Auth’s `cancel-invitation` route marks the invitation status as `canceled`
- Better Auth’s `list-invitations` route returns all invitations, not just pending ones
- The current UI labels the section “Pending Invitations” but renders whatever comes back, so canceled items can reappear after reload

## Product Decisions

### Database Choice

Use Neon Postgres as the production database.

Rationale:

- The app now includes organizations, invitations, multi-party signing packets, signed artifacts, workspace state, and audit-adjacent data
- Postgres is a better long-term production fit than file-based SQLite for concurrency, durability, tooling, and future reporting
- Drizzle and Better Auth both support Postgres well

### Email System

Use one app-level reusable HTML email layout for all transactional emails. The layout remains consistent, and only the content changes per message type.

The email system should:

- stay inside the application codebase
- use Resend directly
- avoid any external template configuration
- preserve the application’s overall theme, tone, and typography direction
- support the requested font links in the document header for email-safe rendering fallback

### Invitation UX

The workspace “Pending Invitations” section should only show pending invitations.

Canceled invitations should:

- disappear immediately on cancel
- remain absent after refresh
- not appear in the pending section with a `canceled` status

If invitation history is needed later, it should be added as a separate surface rather than mixing states into the pending list.

## Proposed Architecture

## 1. Database Migration to Neon

### Runtime

Replace the SQLite runtime with Postgres-backed Neon access in [src/db/index.ts](/Users/chimezie/Desktop/signage/src/db/index.ts).

Target shape:

- Use `DATABASE_URL`
- Initialize a Postgres-compatible client for Neon
- Initialize Drizzle with the Postgres client and Postgres schema

### Schema

Migrate [src/db/schema.ts](/Users/chimezie/Desktop/signage/src/db/schema.ts) from SQLite definitions to Postgres definitions.

Expected change pattern:

- `sqliteTable` -> `pgTable`
- SQLite column helpers -> Postgres equivalents from `drizzle-orm/pg-core`
- boolean/timestamp/default semantics updated to Postgres-native definitions

Schema intent stays the same. The goal is migration of storage dialect, not a domain-model rewrite.

### Drizzle Config

Update [drizzle.config.ts](/Users/chimezie/Desktop/signage/drizzle.config.ts) to:

- use `postgresql` dialect
- read connection info from `DATABASE_URL`
- generate Postgres-compatible migrations

### Better Auth

Update [src/lib/auth.ts](/Users/chimezie/Desktop/signage/src/lib/auth.ts) so the Drizzle adapter uses:

- Postgres-backed Drizzle instance
- `provider: "pg"`

### Data Migration Strategy

Use a one-time migration path from local SQLite into Neon.

Recommended rollout:

1. Convert schema code to Postgres
2. Create Neon database and run migrations
3. Build or run a one-time migration script that reads current local SQLite data and writes it into Neon
4. Verify auth, organizations, invitations, documents, fields, sessions, packets, copies, and packet values
5. Switch app runtime to Neon-backed `DATABASE_URL`

The migration script should preserve:

- auth users/accounts/sessions/organizations/members/invitations
- documents and their field definitions
- sessions/signatures
- packet/copy/value workflow data

## 2. Reusable App-Level Email System

### Shared Mailer Layer

Create a dedicated mail layer that separates:

- delivery
- template rendering
- email-specific payload construction

Suggested shape:

- `src/lib/email/send-email.ts`
- `src/lib/email/templates.ts` or `src/lib/email/render-email.ts`
- optional `src/lib/email/messages/` for message builders

Responsibilities:

- initialize and call Resend
- validate required config
- render shared HTML shell plus message content
- generate a plain-text fallback
- surface meaningful delivery errors

### Shared HTML Template

Create one reusable HTML email document with:

- full `<!DOCTYPE html>` structure
- requested Google Fonts links in the head:
  - Roboto
  - Ruthie
- app-consistent palette and typography
- reusable layout sections:
  - brand header
  - headline
  - intro/body copy
  - primary CTA button
  - supporting note/footer

The template should reflect SleekSign’s product look:

- clean editorial structure
- restrained but distinct brand treatment
- consistent spacing and button hierarchy
- no need for external Resend template configuration

### Dynamic Message Content

Each email use case should provide data into the shared frame instead of building raw HTML inline.

Initial use cases:

1. Reset password
2. Workspace invitation

The system should be easy to extend for future cases like:

- email verification
- workspace notifications
- signer notifications

### Error Handling and Diagnostics

Current email sends fail too quietly. The new mail layer should:

- throw or surface actionable errors when config is missing in environments where email is expected
- capture Resend response failures clearly
- log enough structured context to debug delivery issues safely

The UI should also stop implying success if invite email delivery fails before the route completes.

## 3. Invitation Cancellation Cleanup

### Root Cause

Better Auth behaves correctly at the data layer:

- canceling updates invitation status to `canceled`
- listing returns all invitations for the organization

The bug is that the app renders all returned invitations inside a UI explicitly labeled “Pending Invitations.”

### Fix Strategy

Filter invitations in the app layer to only include pending items for the pending section.

Recommended implementation:

- filter invitation lists after fetch in [src/components/hr/hr-shell.tsx](/Users/chimezie/Desktop/signage/src/components/hr/hr-shell.tsx)
- optionally also normalize in the workspace data loader before state is set

Behavior after fix:

- cancel removes the item optimistically
- refetch/load keeps it removed because non-pending invitations are filtered out
- the section content matches the section title

### Optional Future Extension

If needed later, add a separate “Invitation History” section for:

- canceled
- expired
- accepted

That is out of scope for this implementation.

## Files Expected to Change

### Database

- [src/db/index.ts](/Users/chimezie/Desktop/signage/src/db/index.ts)
- [src/db/schema.ts](/Users/chimezie/Desktop/signage/src/db/schema.ts)
- [drizzle.config.ts](/Users/chimezie/Desktop/signage/drizzle.config.ts)
- one or more new Postgres migrations under [drizzle](/Users/chimezie/Desktop/signage/drizzle)
- likely one migration/import script for SQLite -> Neon data transfer

### Auth and Email

- [src/lib/auth.ts](/Users/chimezie/Desktop/signage/src/lib/auth.ts)
- new shared email files under `src/lib/email/`

### Invitations

- [src/components/hr/hr-shell.tsx](/Users/chimezie/Desktop/signage/src/components/hr/hr-shell.tsx)

## Verification Plan

### Database

1. Run migrations against Neon
2. Start app with Neon-backed `DATABASE_URL`
3. Verify sign-in, workspace loading, and document APIs
4. Verify document and packet workflows still read/write correctly

### Email

1. Trigger forgot-password email
2. Trigger workspace invitation email
3. Confirm both render the same branded shell
4. Confirm CTA links are correct
5. Confirm plaintext fallback is present
6. Confirm delivery failures surface actionable logs/errors

### Invitations

1. Send invite
2. Confirm it appears in pending list
3. Cancel invite
4. Confirm it disappears immediately
5. Refresh page
6. Confirm it does not return in pending list

## Risks

### Schema Dialect Differences

Switching from SQLite to Postgres will require careful column/default conversion, especially for:

- timestamps
- booleans
- text defaults containing serialized JSON

### Better Auth Data Compatibility

Auth table migration must preserve data correctly or login/session/org behavior can break. This needs careful transfer validation.

### Email Client Rendering

Email HTML must stay conservative enough for major mail clients even while reflecting the app’s theme and fonts. The design should not depend on advanced unsupported CSS.

## Recommendation

Proceed with the Neon migration, shared mailer extraction, and pending-invitation filtering in the same implementation cycle. These changes reinforce each other and resolve the current production-readiness gap without introducing unnecessary platform complexity.
