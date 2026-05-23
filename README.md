# SleekSign

SleekSign is a self-hosted document-signing workspace for HR teams and internal operators. It combines a visual document setup editor, role-aware field assignment, signer identity capture, audit trails, and multiple packet-sharing models in one Next.js app.

## Features

- Signature maker:
  - Typed signature rendering
  - Drawn signatures
  - Uploaded signature images
- HR setup tools:
  - Click-to-place document fields
  - Drag and resize controls on top of the PDF
  - Required-field toggles
  - Role assignment per field
  - Role scope controls for shared vs recipient-private signers
- Field types:
  - Signature
  - Text
  - Date
  - Checkbox
- Audit and completion:
  - PDF finalization
  - Certificate of completion pages
  - Signer metadata capture
- Workflow packets:
  - Collaborative packet
  - Individual copies
  - Shared-base plus recipient copies

## Workflow Models

SleekSign now supports three distinct signing models.

### 1. Collaborative Packet

Use this when multiple parties should sign the same evolving document.

- Every signer works on one shared packet
- Parties can see the shared signatures already applied
- The packet finalizes into one shared PDF after all required shared roles complete

Good fit:
- agreements between HR and one employee
- one NDA with multiple live collaborators
- witness flows where everyone is working on the same artifact

### 2. Individual Copies

Use this when each signer should receive a completely isolated signing copy.

- Every signer gets their own independent copy
- No signer sees another signer's fields or values
- Each completed copy produces its own finalized PDF

Good fit:
- handbook acknowledgements
- sending the same template separately to many people
- one-off isolated signing tasks

### 3. Shared-Base + Recipient Copies

Use this when shared company roles should sign once, then many recipients should sign their own derived copies.

- Shared roles like `HR` or `Employer` sign once
- Recipient-private roles like `Employee` or `Contractor` sign separate copies
- Each recipient sees the shared company signatures plus only their own private fields
- Recipients do not see other employees or contractors

Good fit:
- HR to many employees
- employer to many contractors
- pre-signed company forms that fan out to individual recipients

## Role Scope

Every role can be configured as one of:

- `shared`: appears across collaborative flows and shared-base copies
- `private`: unique to each recipient copy

Examples:

- `HR` -> shared
- `Employer` -> shared
- `Employee` -> private
- `Contractor` -> private
- `Witness` -> shared or private depending on the workflow

## Share Flow

Before a document can be shared:

- every field must be assigned to a role
- unassigned fields block the share panel actions

After assignment:

1. Open the document share panel
2. Choose a workflow model
3. Create or reuse a packet for that model
4. Copy role-specific links for the intended signers

## Tech Stack

- Next.js 16
- React 19
- Drizzle ORM
- Neon Postgres
- Tailwind CSS
- pdf-lib
- opentype.js
- react-rnd
- Resend

## Getting Started

1. `npm install`
2. Copy `.env.example` to `.env.local`
3. Set `DATABASE_URL` to your Neon connection string
4. Run `npx drizzle-kit generate`
5. Run your Neon migration command or apply the generated SQL
6. `npm run dev`
7. Open `/`
8. Open the dashboard from the homepage or go directly to `/hr/documents`

## License

MIT
