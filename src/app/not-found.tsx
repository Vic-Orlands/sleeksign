import Link from "next/link";
import { ArrowLeftIcon, FileWarningIcon, HomeIcon, LayoutGridIcon } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[var(--paper)] text-foreground">
      <section className="sleek-grid flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-4xl border border-border bg-background shadow-xl">
          <div className="grid border-b border-border lg:grid-cols-[1.1fr_0.9fr]">
            <div className="border-b border-border p-8 lg:border-b-0 lg:border-r lg:p-10">
              <div className="flex items-center gap-3">
                <span className="border border-border bg-primary px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-primary-foreground">
                  404
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  Page not found
                </span>
              </div>
              <h1 className="mt-8 max-w-2xl font-mono text-3xl font-semibold uppercase leading-tight tracking-tight sm:text-5xl">
                This route does not exist in your signing workspace.
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                The page may have expired, the link may be wrong, or the signed
                file you are trying to open may no longer be available from this
                route. Go back to the dashboard and reopen it from the correct
                workflow.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/hr/documents"
                  className="inline-flex items-center justify-center gap-2 border border-primary bg-primary px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-primary-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Open Dashboard
                  <LayoutGridIcon className="size-4" />
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 border border-border bg-background px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-foreground transition-colors hover:bg-muted"
                >
                  Back Home
                  <HomeIcon className="size-4" />
                </Link>
              </div>
            </div>

            <div className="flex flex-col justify-between bg-secondary/40 p-8 lg:p-10">
              <div>
                <div className="flex size-12 items-center justify-center border border-border bg-background">
                  <FileWarningIcon className="size-5 text-muted-foreground" />
                </div>
                <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  Quick recovery
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                  <li>Check Signed Docs for completed files.</li>
                  <li>Check Shared Activity for packet progress.</li>
                  <li>Reopen the document from the dashboard instead of an old link.</li>
                </ul>
              </div>

              <Link
                href="/hr/documents"
                className="mt-8 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-foreground underline-offset-4 hover:underline"
              >
                <ArrowLeftIcon className="size-4" />
                Return to document management
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
