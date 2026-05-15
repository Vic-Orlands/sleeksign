"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Check, ExternalLink } from "lucide-react";

export default function SharePage() {
  const { id } = useParams();
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/sign/${id}` : "";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <Card className="max-w-xl w-full border-4 border-primary shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
        <CardContent className="p-12 space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">Ready to Sign.</h1>
            <p className="text-muted-foreground font-mono uppercase tracking-widest text-xs">Share this link with the recipient</p>
          </div>

          <div className="p-6 bg-muted border-2 border-border flex items-center justify-between group">
            <code className="text-sm font-bold truncate mr-4">{shareUrl}</code>
            <Button size="icon" variant="ghost" onClick={copyToClipboard} className="hover:bg-background">
              {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
            </Button>
          </div>

          <div className="flex flex-col space-y-3">
            <Button className="w-full font-bold h-14 text-lg uppercase tracking-widest" onClick={() => window.open(shareUrl, "_blank")}>
              Open Signer Portal <ExternalLink className="ml-2 w-5 h-5" />
            </Button>
            <Button variant="outline" className="w-full font-bold h-14 text-lg uppercase tracking-widest" onClick={() => window.location.href = "/hr"}>
              Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
