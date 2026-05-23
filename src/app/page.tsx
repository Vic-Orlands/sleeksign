"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "motion/react";
import {
  NetworkIcon,
  ArrowRightIcon,
  ScanSearchIcon,
  FolderKanbanIcon,
  MoveRight,
} from "lucide-react";
import { PacketModelShowcase } from "@/components/marketing/packet-model-showcase";

export default function LandingPage() {
  const [activeGalleryTab, setActiveGalleryTab] = useState(0);

  const galleryItems = [
    {
      src: "/dashboard/editor.png",
      label: "01 / Editor",
      desc: "Drag and drop signature fields directly onto your source PDF templates.",
    },
    {
      src: "/dashboard/sharing_document.png",
      label: "02 / Sharing",
      desc: "Construct models where candidates share a document, while getting a private copy.",
    },
    {
      src: "/dashboard/all_documents.png",
      label: "03 / Vault",
      desc: "Centralize all your operations and outstanding packet signing tasks.",
    },
    {
      src: "/dashboard/group_documents.png",
      label: "04 / Signed Copies",
      desc: "Easily retrieve, export, and manage completed document signatures.",
    },
  ];

  return (
    <main className="min-h-screen bg-[(--paper)] text-foreground font-roboto relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative mx-auto w-[90%] max-w-7xl pt-28 pb-32 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center text-center"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mb-16 flex flex-col items-center justify-center"
          >
            <span className="font-cursive text-[48px] sm:text-[64px] text-foreground leading-none">
              SleekSign
            </span>
            <span className="mt-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
              document-signing workspace
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="max-w-4xl text-[36px] sm:text-[48px] lg:text-[60px] font-light leading-[1.05] tracking-tight text-foreground"
          >
            Show every signer exactly how a document{" "}
            <span className="font-cursive text-[48px] sm:text-[64px] lg:text-[76px] leading-[0.5] text-orange-500 -ml-1 pr-2">
              moves
            </span>{" "}
            before it ever gets shared.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-4 max-w-2xl text-[14px] sm:text-[16px] leading-[1.7] text-muted-foreground font-light text-center"
          >
            Visually map out who shares a collaborative document, who receives a
            private isolated copy, and how employer signatures carry forward.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-6 flex flex-col gap-4 sm:flex-row justify-center"
          >
            <a
              href="/hr"
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-8 py-3.5 text-[10px] uppercase tracking-[0.15em] font-medium text-primary-foreground transition-all hover:bg-primary/90"
            >
              <span className="relative z-10 flex items-center gap-2">
                Get started
                <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* Graph Showcase */}
      <section className="relative mx-auto w-[85%] max-w-6xl py-24 z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1 }}
        >
          <PacketModelShowcase />
        </motion.div>
      </section>

      {/* Features Outline */}
      <section className="relative mx-auto w-[60%] max-w-4xl py-32 z-10">
        <div className="grid gap-12 sm:grid-cols-3">
          <Metric
            label="Model selection"
            value="Shared, private, or employer-first modes"
            icon={NetworkIcon}
            delay={0.2}
          />
          <Metric
            label="Document control"
            value="Archive, restore, review, and route intuitively"
            icon={FolderKanbanIcon}
            delay={0.4}
          />
          <Metric
            label="Signer visibility"
            value="Only the right collaborators see the right fields"
            icon={ScanSearchIcon}
            delay={0.6}
          />
        </div>
      </section>

      {/* Product Gallery Section */}
      <section className="relative z-10 w-full py-24 mt-10 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12 mx-auto w-[90%] max-w-6xl"
        >
          <p className="text-[9px] uppercase tracking-[0.2em] text-orange-500/70 font-medium mb-4">
            Platform Interface
          </p>
          <h2 className="text-[24px] sm:text-[30px] font-light tracking-tight text-foreground leading-[1.2]">
            Everything happens in one{" "}
            <span className="font-cursive text-[32px] sm:text-[40px] text-stone-500/80 italic pr-1">
              fluid
            </span>{" "}
            workspace.
          </h2>
        </motion.div>

        <div className="w-[90%] max-w-6xl mx-auto flex flex-col md:flex-row gap-8 lg:gap-16 items-center">
          {/* Menu Items */}
          <div className="w-full md:w-1/3 flex flex-col gap-6">
            {galleryItems.map((item, i) => (
              <button
                key={i}
                onClick={() => setActiveGalleryTab(i)}
                className={`text-left transition-all duration-300 ${activeGalleryTab === i ? "opacity-100" : "opacity-40 hover:opacity-70"}`}
              >
                <div className="text-[10px] uppercase tracking-[0.2em] font-medium mb-3 text-foreground flex items-center gap-2">
                  {item.label}
                  {activeGalleryTab === i && (
                    <motion.div
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <MoveRight className="size-3.5 text-orange-500/80" />
                    </motion.div>
                  )}
                </div>
                <p className="text-[13px] font-light leading-[1.6] text-muted-foreground">
                  {item.desc}
                </p>
              </button>
            ))}
          </div>

          {/* Image Display */}
          <div className="w-full md:w-2/3 relative rounded-2xl overflow-hidden h-75 sm:h-112.5 lg:h-120 shadow-2xl">
            {galleryItems.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{
                  opacity: activeGalleryTab === i ? 1 : 0,
                  scale: activeGalleryTab === i ? 1 : 0.97,
                  zIndex: activeGalleryTab === i ? 10 : 0,
                }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 bg-[(--paper)]"
              >
                <Image
                  src={item.src}
                  alt={item.label}
                  className="w-full h-full object-contain rounded-2xl"
                  width={1000}
                  height={1000}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Section */}
      <section className="relative z-10 mx-auto w-[85%] max-w-5xl py-24 text-center flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center max-w-3xl"
        >
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-6">
            Built for operations
          </p>
          <h2 className="text-[26px] sm:text-[32px] font-light tracking-tight text-foreground leading-[1.2]">
            Everything after the{" "}
            <span className="font-cursive text-[36px] sm:text-[46px] leading-[0.5] text-stone-500/80 -ml-1 italic pr-1">
              graph
            </span>{" "}
            still lives inside the same system.
          </h2>
          <p className="mt-8 max-w-xl text-[14px] leading-[1.8] text-muted-foreground font-light text-center relative mb-12">
            <span className="absolute -left-4 -top-2 text-4xl font-cursive">
              &quot;
            </span>
            Place fields directly on the source PDF, assign roles, stop sharing
            when fields are still unassigned, and track signed files.
            <span className="absolute -right-4 bottom-0 text-4xl font-cursive">
              &quot;
            </span>
          </p>
        </motion.div>
      </section>

      {/* Use Cases Section */}
      <section className="relative z-10 mx-auto w-[80%] max-w-4xl mb-20 py-20 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-[9px] uppercase tracking-[0.2em] text-orange-500/70 font-medium mb-8">
            Use cases
          </p>
          <p className="text-[14px] sm:text-[16px] leading-loose text-foreground/80 font-light tracking-wide">
            Offer letters{" "}
            <span className="text-muted-foreground/30 mx-2">/</span>
            contractor packs{" "}
            <span className="text-muted-foreground/30 mx-2">/</span>
            onboarding forms{" "}
            <span className="text-muted-foreground/30 mx-2">/</span>
            NDA workflows{" "}
            <span className="text-muted-foreground/30 mx-2">/</span>
            <br className="hidden sm:block" />
            witness-based approvals{" "}
            <span className="text-muted-foreground/30 mx-2">/</span>
            shared employer sign-off with private recipient copies
          </p>
        </motion.div>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  delay,
}: {
  label: string;
  value: string;
  icon: typeof NetworkIcon;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6 }}
      className="flex flex-col items-center text-center"
    >
      <div className="flex flex-col items-center gap-4 opacity-80">
        <Icon className="size-5 text-muted-foreground/60" />
        <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
          {label}
        </p>
      </div>
      <p className="mt-4 text-[13px] font-light leading-[1.6] text-foreground/80 max-w-50">
        {value}
      </p>
    </motion.div>
  );
}
