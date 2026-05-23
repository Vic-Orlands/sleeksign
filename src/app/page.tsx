import Link from "next/link";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  FileSignatureIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
} from "lucide-react";

const workflowCards = [
  {
    label: "Collaborative packet",
    title: "One live document for every signer in the chain.",
    copy: "Ideal when multiple parties must sign the same evolving agreement and see the same document state.",
    icon: UsersRoundIcon,
  },
  {
    label: "Individual copies",
    title: "One template, many isolated signing copies.",
    copy: "Best for independent acknowledgements, tax forms, or bulk distribution where nobody should see anyone else.",
    icon: FileSignatureIcon,
  },
  {
    label: "Shared-base copies",
    title: "Company signs once, recipients countersign their own copy.",
    copy: "Perfect for HR-to-many workflows where employer signatures appear everywhere but recipients stay private.",
    icon: ShieldCheckIcon,
  },
];

export default function RootPage() {
  return (
    <main className="min-h-screen bg-[var(--paper)] text-foreground">
      <section className="sleek-grid border-b border-border">
        <div className="mx-auto grid min-h-[76vh] max-w-7xl gap-0 px-5 py-6 lg:grid-cols-[minmax(0,1.1fr)_24rem] lg:px-8 lg:py-8">
          <div className="border border-border bg-background p-8 shadow-xl sm:p-10 lg:p-12">
            <div className="flex items-center gap-3">
              <span className="border border-border bg-primary px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-primary-foreground">
                SleekSign
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                Document packets for HR teams
              </span>
            </div>

            <h1 className="mt-10 max-w-4xl font-mono text-4xl font-semibold uppercase leading-none tracking-tight sm:text-6xl">
              Send one document system across shared signers, private recipients,
              and employer-first approval flows.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Place fields directly on the PDF, assign each one by role, choose
              the right signing model, and keep completed files, signer history,
              and audit detail inside one workspace.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/hr/documents"
                className="inline-flex items-center justify-center gap-2 border border-primary bg-primary px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-primary-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Open Dashboard
                <ArrowRightIcon className="size-4" />
              </Link>
              <Link
                href="/signin"
                className="inline-flex items-center justify-center gap-2 border border-border bg-background px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-foreground transition-colors hover:bg-muted"
              >
                Sign In
              </Link>
            </div>

            <div className="mt-12 grid gap-4 border-t border-border pt-6 sm:grid-cols-3">
              <Metric label="Workflow models" value="3" />
              <Metric label="Field assignment" value="Role-based" />
              <Metric label="Completed output" value="Audit-ready PDF" />
            </div>
          </div>

          <aside className="border-x border-b border-border bg-secondary/35 p-6 lg:border-x-0 lg:border-y lg:border-r">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              Workspace snapshot
            </p>

            <div className="mt-5 grid gap-3">
              <PanelStat label="Needs setup" value="Field placement" />
              <PanelStat label="Shared activity" value="Packet tracking" />
              <PanelStat label="Signed docs" value="Review + download" />
            </div>

            <div className="mt-8 border border-border bg-background p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                What teams remember
              </p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                The right packet model for the job, role-scoped field assignment,
                and one clean dashboard for setup, signer activity, and completed
                files.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              Workflow packets
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Three signing models, one operating surface.
            </h2>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {workflowCards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.label}
                className="border border-border bg-background p-6 shadow-sm transition-colors hover:bg-secondary/30"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                    {card.label}
                  </span>
                  <span className="flex size-9 items-center justify-center border border-border bg-secondary">
                    <Icon className="size-4 text-muted-foreground" />
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-semibold leading-6">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {card.copy}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-t border-border bg-background">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              What ships with every completion
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <ChecklistItem text="Typed, drawn, or uploaded signatures" />
              <ChecklistItem text="Role-specific field ownership" />
              <ChecklistItem text="Downloadable finalized documents" />
            </div>
          </div>

          <div className="border border-border bg-[var(--paper)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              Built for HR operations
            </p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Offer letters, onboarding packets, contractor docs, witness flows,
              and employer-signed recipient copies all fit in the same system.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-secondary/35 px-4 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function PanelStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-background px-4 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 border border-border bg-secondary/25 p-4">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center border border-border bg-background">
        <CheckCircle2Icon className="size-3.5 text-muted-foreground" />
      </span>
      <p className="text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
