"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  HomeIcon,
  ArrowLeftIcon,
  LayoutGridIcon,
  FileWarningIcon,
} from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[(--paper)] text-foreground font-sans relative flex items-center justify-center overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />

      <section className="relative z-10 mx-auto w-[90%] max-w-5xl py-20 px-4 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="w-full bg-white/40 backdrop-blur-sm border border-border/50 rounded-[2rem] overflow-hidden shadow-sm"
        >
          <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
            {/* Left content area */}
            <div className="p-10 lg:p-14 border-b lg:border-b-0 lg:border-r border-border/50 flex flex-col justify-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Page not found
              </p>

              <h1 className="mt-10 font-light text-[32px] sm:text-[42px] leading-[1.1] tracking-tight">
                This route{" "}
                <span className="font-cursive italic text-stone-500/80 pr-1 text-[40px] sm:text-[46px] leading-[0.5] -ml-1">
                  vanished
                </span>{" "}
                from the workspace.
              </h1>

              <p className="mt-8 text-[14px] leading-[1.8] text-muted-foreground font-light max-w-lg">
                The page may have expired, the link may be wrong, or the signed
                file you are trying to open may no longer be available from this
                route. Return to your active documents or dashboard.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/"
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-[10px] uppercase tracking-[0.15em] font-medium text-primary-foreground transition-all hover:bg-primary/90"
                >
                  Open Dashboard
                  <LayoutGridIcon className="size-3.5" />
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 bg-white/50 px-8 py-3.5 text-[10px] uppercase tracking-[0.15em] font-medium transition-colors hover:bg-stone-50 text-foreground"
                >
                  Back Home
                  <HomeIcon className="size-3.5" />
                </Link>
              </div>
            </div>

            {/* Right helper area */}
            <div className="p-10 lg:p-14 bg-stone-50/50 flex flex-col justify-between">
              <div>
                <div className="size-12 rounded-2xl border border-border/60 bg-white shadow-sm flex items-center justify-center mb-8">
                  <FileWarningIcon className="size-5 text-muted-foreground/70" />
                </div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-foreground font-medium mb-6">
                  Quick recovery
                </p>
                <ul className="space-y-4 text-[13px] leading-[1.6] text-muted-foreground font-light">
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 size-1 rounded-full bg-orange-500/40 shrink-0" />
                    <span>
                      Check{" "}
                      <strong className="font-medium text-foreground/80">
                        Signed Docs
                      </strong>{" "}
                      for completed and executed files.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 size-1 rounded-full bg-orange-500/40 shrink-0" />
                    <span>
                      Review{" "}
                      <strong className="font-medium text-foreground/80">
                        Shared Activity
                      </strong>{" "}
                      for packet progress and history.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 size-1 rounded-full bg-orange-500/40 shrink-0" />
                    <span>
                      Reopen the document from the shared dashboard instead of
                      an old link.
                    </span>
                  </li>
                </ul>
              </div>

              <Link
                href="/"
                className="mt-12 group inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeftIcon className="size-3.5 transition-transform group-hover:-translate-x-1" />
                Return to management
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
