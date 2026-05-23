"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, FileText, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type PublicDocument = {
  id: string;
  name: string;
  signerRoles: string[];
};

type PublicPacket = {
  id: string;
  mode: string;
  status: string;
  roleConfigs: Array<{ name: string; scope: "shared" | "private" }>;
  document: {
    id: string;
    name: string;
  };
};

export default function PublicSignLanding() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const savedSigner = getSavedSigner();
  const [doc, setDoc] = useState<PublicDocument | null>(null);
  const [packet, setPacket] = useState<PublicPacket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [signerName, setSignerName] = useState(savedSigner.signerName);
  const [signerEmail, setSignerEmail] = useState(savedSigner.signerEmail);
  const [signerRole, setSignerRole] = useState(savedSigner.signerRole);
  const requestedRole = searchParams.get("role") || "";
  const packetId = searchParams.get("packet") || "";

  const roleOptions = useMemo(
    () =>
      packet
        ? packet.roleConfigs.map((role) => role.name)
        : doc?.signerRoles || [],
    [doc?.signerRoles, packet],
  );

  useEffect(() => {
    const target = packetId
      ? `/api/public-packets/${packetId}`
      : `/api/public-documents/${id}`;

    fetch(target)
      .then((res) => res.json())
      .then((data) => {
        if (packetId) {
          setPacket(data);
          const packetRoles = data.roleConfigs?.map(
            (role: { name: string }) => role.name,
          );
          const validRequestedRole = packetRoles?.includes(requestedRole)
            ? requestedRole
            : "";
          setSignerRole(validRequestedRole || savedSigner.signerRole || packetRoles?.[0] || "");
          return;
        }

        setDoc(data);
        const validRequestedRole = data.signerRoles?.includes(requestedRole)
          ? requestedRole
          : "";
        setSignerRole(validRequestedRole || savedSigner.signerRole || data.signerRoles?.[0] || "");
      })
      .catch(() => toast.error("Document not found"))
      .finally(() => setIsLoading(false));
  }, [id, packetId, requestedRole, savedSigner.signerRole]);

  async function startSigning(event: FormEvent) {
    event.preventDefault();
    if (!signerName.trim()) {
      toast.error("Enter your full name");
      return;
    }
    if (!signerRole) {
      toast.error("Select who is signing");
      return;
    }

    setIsCreating(true);
    try {
      localStorage.setItem(
        "sleeksign:last-signer",
        JSON.stringify({
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim(),
          signerRole,
        }),
      );

      if (packetId) {
        const copyRes = await fetch("/api/public-packet-copies", {
          method: "POST",
          body: JSON.stringify({
            packetId,
            roleName: signerRole,
            signerName,
            signerEmail,
          }),
        });
        const copyData = await copyRes.json();
        router.push(
          `/sign/packet/${packetId}?role=${encodeURIComponent(signerRole)}${
            copyData.copyId ? `&copyId=${encodeURIComponent(copyData.copyId)}` : ""
          }`,
        );
        return;
      }

      const res = await fetch("/api/sessions", {
        method: "POST",
        body: JSON.stringify({
          documentId: id,
          signerName,
          signerEmail,
          signerRole,
        }),
      });
      const data = await res.json();
      if (!data.sessionId) throw new Error("No session created");
      router.push(`/sign/${data.sessionId}`);
    } catch {
      toast.error("Failed to initialize signing session");
      setIsCreating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!doc && !packet) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        Document not found
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--paper)] p-6">
      <main className="grid w-full max-w-5xl overflow-hidden border border-border bg-card shadow-2xl lg:grid-cols-[0.9fr_1.1fr]">
        <section className="sleek-grid border-b border-border bg-background p-8 lg:border-b-0 lg:border-r">
          <div className="flex size-12 items-center justify-center bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="size-6" />
          </div>
          <h1 className="mt-6 max-w-[17rem] whitespace-normal break-words font-mono text-2xl font-semibold uppercase leading-tight tracking-tight sm:max-w-full sm:text-3xl">
            Review and sign securely
          </h1>
          <p className="mt-3 max-w-md leading-7 text-muted-foreground">
            This signing session records your name, completion time, and audit
            metadata for Any.
          </p>
          <div className="mt-8 border border-border bg-background p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center bg-muted">
                <FileText className="size-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  Document
                </p>
                <h2 className="truncate font-semibold">
                  {packet?.document.name || doc?.name}
                </h2>
              </div>
            </div>
          </div>
        </section>

        <form onSubmit={startSigning} className="flex flex-col gap-5 p-8">
          <div>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest">
              Before you start
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your legal name so your signature and certificate match the
              signed PDF.
            </p>
          </div>

          <label className="flex flex-col gap-1.5">
            <Label>Signing as</Label>
            <Select
              value={signerRole}
              onChange={(event) => setSignerRole(event.target.value)}
              className="h-11"
              disabled={Boolean(requestedRole && roleOptions.includes(requestedRole))}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1.5">
            <Label>Your full name</Label>
            <Input
              value={signerName}
              onChange={(event) => setSignerName(event.target.value)}
              placeholder="John Doe"
              required
              className="h-11"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label>Email address</Label>
            <Input
              type="email"
              value={signerEmail}
              onChange={(event) => setSignerEmail(event.target.value)}
              placeholder="john@company.com"
              className="h-11"
            />
          </label>

          <Button
            type="submit"
            disabled={isCreating}
            className="h-11 w-full gap-2"
          >
            {isCreating ? <Loader2 className="size-4 animate-spin" /> : null}
            Start signing
            <ArrowRight className="size-4" />
          </Button>

          <p className="text-xs leading-5 text-muted-foreground">
            By continuing, you consent to use electronic records and signatures
            for this document.
          </p>
        </form>
      </main>
    </div>
  );
}

function getSavedSigner() {
  if (typeof window === "undefined") return { signerName: "", signerEmail: "" };

  const savedSigner = localStorage.getItem("sleeksign:last-signer");
  if (!savedSigner) return { signerName: "", signerEmail: "" };

  try {
    const parsed = JSON.parse(savedSigner) as {
      signerName?: string;
      signerEmail?: string;
      signerRole?: string;
    };
    return {
      signerName: parsed.signerName || "",
      signerEmail: parsed.signerEmail || "",
      signerRole: parsed.signerRole || "",
    };
  } catch {
    localStorage.removeItem("sleeksign:last-signer");
    return { signerName: "", signerEmail: "", signerRole: "" };
  }
}
