import type { RequestHandler } from "./$types";
import { generateSignatureSVG } from "@/lib/signature-engine";

export const POST: RequestHandler = async ({ request: req }) => {
  try {
    const { name, fontIndex } = await req.json();
    if (!name)
      return Response.json({ error: "Name is required" }, { status: 400 });

    const svgData = await generateSignatureSVG(name, fontIndex);
    return Response.json(svgData);
  } catch (error) {
    console.error("Signature generation error:", error);
    return Response.json(
      { error: "Failed to generate signature" },
      { status: 500 },
    );
  }
}
