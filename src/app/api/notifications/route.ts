import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, type, signerName } = await req.json();

    console.log(`[NOTIFICATION] ${type}: Session ${sessionId} was finalized by ${signerName}`);

    return NextResponse.json({ success: true, message: "Notification sent (mock)" });
  } catch {
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
