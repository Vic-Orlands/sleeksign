"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";

type SessionRecord = {
  id: string;
  documentId: string;
  signerName?: string | null;
};

export default function SharePage() {
  const { id } = useParams();
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sessions?sessionId=${id}`)
      .then((res) => res.json())
      .then((data) => {
        setSession(data);
        setIsLoading(false);
      });
  }, [id]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  if (isLoading)
    return (
  <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="animate-spin" />
      </div>
    );

  const uniqueUrl =
    typeof window !== "undefined" ? `${window.location.origin}/sign/${id}` : "";
  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/sign/p/${session?.documentId}`
      : "";

  return (
    <div className="sleek-grid flex min-h-screen items-center justify-center bg-[var(--paper)] p-8">
      <Card className="w-full max-w-2xl rounded-none border border-border bg-background shadow-2xl">
        <CardContent className="p-12 space-y-10">
          <div className="space-y-2">
            <h1 className="font-mono text-5xl font-semibold uppercase leading-none tracking-tighter">
              Ready to Sign.
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Secure Document Distribution v2.1
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                  Option 1: Unique Link (Specific to {session?.signerName})
                </Label>
                <Badge variant="outline" className="h-4 rounded-none font-mono text-[8px]">
                  ONE-TIME USE
                </Badge>
              </div>
              <div className="group flex items-center justify-between border border-border bg-background p-4 shadow-inner">
                <code className="text-xs font-bold truncate mr-4 text-muted-foreground">
                  {uniqueUrl}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => copyToClipboard(uniqueUrl)}
                  className="hover:bg-primary hover:text-primary-foreground h-10 w-10"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                  Option 2: Public Link (Send to entire staff)
                </Label>
                <Badge
                  variant="default"
                  className="h-4 rounded-none bg-primary font-mono text-[8px] text-primary-foreground"
                >
                  MULTI-USER
                </Badge>
              </div>
              <div className="group flex items-center justify-between border border-primary/20 bg-primary/5 p-4 shadow-inner">
                <code className="text-xs font-bold truncate mr-4 text-primary">
                  {publicUrl}
                </code>
                <Button
                  size="icon"
                  variant="default"
                  onClick={() => copyToClipboard(publicUrl)}
                  className="h-10 w-10"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="font-mono text-[9px] font-medium uppercase tracking-tight text-muted-foreground">
                * Recommended for high-volume signing (NDAs, Employee Handbooks,
                etc.)
              </p>
            </div>
          </div>

          <div className="flex flex-col space-y-4 pt-4">
            <Button
              className="h-12 w-full"
              onClick={() => (window.location.href = "/hr")}
            >
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
