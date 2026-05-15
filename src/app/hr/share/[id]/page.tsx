"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Check, ExternalLink, Loader2 } from "lucide-react";

export default function SharePage() {
  const { id } = useParams();
  const [session, setSession] = useState<any>(null);
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
      <div className="h-screen flex items-center justify-center">
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
    <div className="min-h-screen bg-muted/20 flex items-center justify-center p-8 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
      <Card className="max-w-2xl w-full border-4 border-primary shadow-[24px_24px_0px_0px_rgba(0,0,0,1)] rounded-none">
        <CardContent className="p-12 space-y-10">
          <div className="space-y-2">
            <h1 className="text-5xl font-black tracking-tighter uppercase italic leading-none">
              Ready to Sign.
            </h1>
            <p className="text-muted-foreground font-mono uppercase tracking-widest text-[10px]">
              Secure Document Distribution v2.1
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-black uppercase text-[10px] tracking-widest text-primary italic">
                  Option 1: Unique Link (Specific to {session?.signerName})
                </Label>
                <Badge variant="outline" className="font-mono text-[8px] h-4">
                  ONE-TIME USE
                </Badge>
              </div>
              <div className="p-4 bg-background border-2 border-border flex items-center justify-between group shadow-inner">
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
                <Label className="font-black uppercase text-[10px] tracking-widest text-primary italic">
                  Option 2: Public Link (Send to entire staff)
                </Label>
                <Badge
                  variant="default"
                  className="font-mono text-[8px] h-4 bg-primary text-primary-foreground"
                >
                  MULTI-USER
                </Badge>
              </div>
              <div className="p-4 bg-primary/5 border-2 border-primary/20 flex items-center justify-between group shadow-inner">
                <code className="text-xs font-bold truncate mr-4 text-primary">
                  {publicUrl}
                </code>
                <Button
                  size="icon"
                  variant="default"
                  onClick={() => copyToClipboard(publicUrl)}
                  className="shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] h-10 w-10"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tight italic">
                * Recommended for high-volume signing (NDAs, Employee Handbooks,
                etc.)
              </p>
            </div>
          </div>

          <div className="flex flex-col space-y-4 pt-4">
            <Button
              className="w-full font-black h-16 text-lg uppercase tracking-widest shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
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
