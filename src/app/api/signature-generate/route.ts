import { NextRequest, NextResponse } from "next/server";
import { generateSignatureSVG } from "@/lib/signature-engine";

export async function POST(req: NextRequest) {
  try {
    const { name, fontIndex } = await req.json();
    if (!name)
      return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const svgData = await generateSignatureSVG(name, fontIndex);
    return NextResponse.json(svgData);
  } catch (error) {
    console.error("Signature generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate signature" },
      { status: 500 },
    );
  }
}
