# SleekSign

SleekSign is a self-hosted document-signing workspace. Place fields on a PDF, assign signer roles, share packet links, and collect signatures with audit trails.

## Features

- Signature maker — typed, drawn, or uploaded
- Document setup — click-to-place fields, drag/resize, required toggles, role assignment
- Field types — signature, text, date, checkbox
- Workflow packets — collaborative, individual, and shared-base models
- Share & send — role links, email/signer/group send, CSV bulk send
- Audit — signer timeline, grouped event history, finalized PDFs

## Workflow Models

**Collaborative** — everyone signs the same live packet and sees shared signatures.

**Individual** — each signer gets an isolated copy; no cross-visibility.

**Shared** — shared roles (e.g. Owner) sign once; each recipient signs their own copy with those shared signatures already applied.

## Role Scope

- `shared` — visible across collaborative flows and shared-base copies
- `private` — unique to each recipient copy

Default roles: Owner, Employee, Contractor.

## Share Flow

1. Assign every field to a role
2. Open **Share Document**
3. Pick a workflow model and create/reuse a packet
4. Copy role links (or send from Bulk Send)

## Setup

1. `pnpm install`
2. Copy [`.env.example`](.env.example) to `.env.local` and fill in the values
3. Apply database migrations
4. `pnpm dev` → open `/` then `/docs`

## License

MIT
