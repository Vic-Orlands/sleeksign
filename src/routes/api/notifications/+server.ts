import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request: req }) => {
  try {
    const { sessionId, type, signerName } = await req.json();

    console.log(`[NOTIFICATION] ${type}: Session ${sessionId} was finalized by ${signerName}`);

    return Response.json({ success: true, message: "Notification sent (mock)" });
  } catch {
    return Response.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
