import { NextRequest, NextResponse } from "next/server";

import { createOtpChallenge, verifyOtpChallenge } from "@/lib/signer-otp";
import { getPacket } from "@/lib/signing-workflows";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { roleName, copyId, recipientEmail, code, action } = (await req.json()) as {
      roleName?: string;
      copyId?: string | null;
      recipientEmail?: string;
      code?: string;
      action?: "send" | "verify";
    };

    if (!roleName) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    const packet = await getPacket(id);
    if (!packet.requireOtp) {
      return NextResponse.json({ verified: true });
    }

    if (action === "verify") {
      if (!code) {
        return NextResponse.json({ error: "OTP code is required" }, { status: 400 });
      }

      const result = await verifyOtpChallenge({
        packetId: packet.id,
        copyId: copyId || null,
        roleName,
        code,
        requestHeaders: req.headers,
      });

      return NextResponse.json(result);
    }

    if (!recipientEmail?.trim()) {
      return NextResponse.json(
        { error: "Recipient email is required" },
        { status: 400 },
      );
    }

    const result = await createOtpChallenge({
      packetId: packet.id,
      copyId: copyId || null,
      roleName,
      recipientEmail: recipientEmail.trim(),
      requestHeaders: req.headers,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "OTP request failed",
      },
      { status: 500 },
    );
  }
}
