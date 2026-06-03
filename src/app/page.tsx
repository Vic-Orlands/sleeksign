"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
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

  useEffect(() => {
    document.body.classList.add("landing-page");
    return () => {
      document.body.classList.remove("landing-page");
    };
  }, []);

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
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full! bg-primary px-8 py-3.5 text-[10px] uppercase tracking-[0.15em] font-medium text-primary-foreground transition-all hover:bg-primary/90"
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

      {/* Features and Use Cases Outline */}
      <section className="relative z-10 w-full py-12 lg:py-18 mb-20 flex justify-center">
        <div className="w-fit grid grid-cols-1 lg:grid-cols-2 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8 }}
            className="flex flex-col w-fit ml-auto lg:pr-10"
          >
            <div className="flex flex-col gap-6">
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col text-left lg:border-l lg:border-border/50 lg:pl-10"
          >
            <p className="text-[9px] uppercase tracking-[0.2em] text-orange-500/70 font-medium mb-8">
              Use cases
            </p>
            <ul className="space-y-5 text-[14px] sm:text-[15px] leading-relaxed text-foreground/80 font-light list-none">
              <UseCaseItem
                title="Offer letters & contractor packs"
                model="Collaborative"
                detail="Multi-party signing on a single document."
              />
              <UseCaseItem
                title="Onboarding forms"
                model="Individual copies"
                detail="Separate copies for each recipient."
              />
              <UseCaseItem
                title="Strict NDA workflows"
                model="Collaborative"
                detail="Audit-ready shared agreement."
              />
              <UseCaseItem
                title="Witness-based approvals"
                model="Collaborative"
                detail="HR, signer, and witness in one chain."
              />
              <UseCaseItem
                title="Shared employer sign-off"
                model="Shared-base"
                detail="Employer signature feeds multiple copies."
              />
            </ul>
            <div className="mt-4">
              <a
                href="/hr"
                className="group inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-medium text-foreground hover:text-orange-500 transition-colors"
              >
                <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
                Explore the dashboard
              </a>
            </div>
          </motion.div>
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
          <p className="text-[9px] uppercase tracking-[0.2em] text-orange-500/70 font-medium mb-6">
            Built for operations
          </p>
          <h2 className="text-[26px] sm:text-[32px] font-light tracking-tight text-foreground leading-[1.2]">
            Everything after the{" "}
            <span className="font-cursive text-[36px] sm:text-[46px] leading-[0.5] text-stone-500/80 -ml-1 italic pr-1">
              graph
            </span>{" "}
            still lives inside the same system.
          </h2>
          <p className="mt-8 max-w-xl text-[14px] leading-[1.8] text-muted-foreground font-light text-center relative mb-6">
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
    </main>
  );
}

function UseCaseItem({
  title,
  model,
  detail,
}: {
  title: string;
  model: string;
  detail: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <li
      className="relative flex items-center gap-3 cursor-default"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="size-1 rounded-full bg-orange-500/40" />
      <span>{title}</span>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 5 }}
            className="absolute left-full ml-3 z-50 w-fit min-w-35 p-3 rounded-xl bg-white border border-border shadow-xl backdrop-blur-sm pointer-events-none"
          >
            <div className="flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-wider text-orange-500 font-bold whitespace-nowrap">
                {model}
              </span>
              <span className="text-[12px] text-muted-foreground leading-tight font-light whitespace-nowrap">
                {detail}
              </span>
            </div>
            {/* Tooltip Arrow */}
            <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 border-y-[6px] border-y-transparent border-r-[6px] border-r-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </li>
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
      className="flex flex-col items-center text-center lg:items-start lg:text-right"
    >
      <div className="flex items-center ml-auto gap-2 opacity-80">
        <Icon className="size-5 text-foreground" />
        <p className="text-[10px] uppercase tracking-[0.15em] text-foreground font-medium">
          {label}
        </p>
      </div>
      <p className="mt-4 text-[13px] font-light leading-[1.6] text-muted-foreground max-w-50">
        {value}
      </p>
    </motion.div>
  );
}
