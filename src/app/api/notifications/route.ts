import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, type, signerName } = await req.json();

    // MOCK: This is where you would integrate Resend, Postmark, etc.
    console.log(`[NOTIFICATION] ${type}: Session ${sessionId} was finalized by ${signerName}`);

    return NextResponse.json({ success: true, message: "Notification sent (mock)" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
