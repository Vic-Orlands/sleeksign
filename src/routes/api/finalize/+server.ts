import type { RequestHandler } from "./$types";
import { finalizeDocument } from "@/lib/pdf-engine";

export const POST: RequestHandler = async ({ request: req }) => {
  try {
    const { sessionId } = await req.json();
    const finalUrl = await finalizeDocument(sessionId);

    // Trigger notification (fire and forget for this mock)
    fetch(`${new URL(req.url).origin}/api/notifications`, {
      method: "POST",
      body: JSON.stringify({ sessionId, type: "COMPLETED" }),
    }).catch(console.error);

    return Response.json({ url: finalUrl, status: "completed" });
  } catch (error) {
    console.error("Finalization error:", error);
    return Response.json(
      { error: "Failed to finalize document" },
      { status: 500 },
    );
  }
}
