import type { RequestHandler } from "./$types";

import { createOtpChallenge, verifyOtpChallenge } from "@/lib/signer-otp";
import { getPacket } from "@/lib/signing-workflows";

export const POST: RequestHandler = async ({ request: req, params }) => {
  try {
    const { id } = params;
    const { roleName, copyId, recipientEmail, code, action } = (await req.json()) as {
      roleName?: string;
      copyId?: string | null;
      recipientEmail?: string;
      code?: string;
      action?: "send" | "verify";
    };

    if (!roleName) {
      return Response.json({ error: "Role name is required" }, { status: 400 });
    }

    const packet = await getPacket(id);
    if (!packet.requireOtp) {
      return Response.json({ verified: true });
    }

    if (action === "verify") {
      if (!code) {
        return Response.json({ error: "OTP code is required" }, { status: 400 });
      }

      const result = await verifyOtpChallenge({
        packetId: packet.id,
        copyId: copyId || null,
        roleName,
        code,
        requestHeaders: req.headers,
      });

      return Response.json(result);
    }

    if (!recipientEmail?.trim()) {
      return Response.json(
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

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "OTP request failed",
      },
      { status: 500 },
    );
  }
}
