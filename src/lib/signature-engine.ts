import * as opentypeModule from "opentype.js";
import type { Font } from "opentype.js";
import fs from "fs";
import path from "path";

const FONTS = [
  "signature2.ttf",
  "signature4.ttf",
];

function parseFont(fontPath: string) {
  const buffer = fs.readFileSync(fontPath);
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );

  return getOpenTypeParser()(arrayBuffer);
}

export async function generateSignatureSVG(
  name: string,
  fontIndex: number = 0,
) {
  const fontOrder = [
    FONTS[fontIndex] || FONTS[0],
    ...FONTS.filter((font) => font !== (FONTS[fontIndex] || FONTS[0])),
  ];

  let font: Font | null = null;

  for (const fontFile of fontOrder) {
    try {
      const fontPath = path.join(process.cwd(), "public/fonts", fontFile);
      font = parseFont(fontPath);
      break;
    } catch {
      continue;
    }
  }

  if (!font) {
    throw new Error("No valid signature fonts available");
  }

  const glyphPath = font.getPath(name, 10, 60, 72);
  const svgPathData = glyphPath.toPathData(2);
  const { x1, y1, x2, y2 } = glyphPath.getBoundingBox();

  const width = x2 - x1 + 20;
  const height = y2 - y1 + 20;

  return {
    pathData: svgPathData,
    viewBox: `${x1 - 10} ${y1 - 10} ${width} ${height}`,
    width,
    height,
  };
}

function getOpenTypeParser() {
  const parser =
    "parse" in opentypeModule && typeof opentypeModule.parse === "function"
      ? opentypeModule.parse
      : "default" in opentypeModule &&
          opentypeModule.default &&
          typeof opentypeModule.default === "object" &&
          "parse" in opentypeModule.default &&
          typeof opentypeModule.default.parse === "function"
        ? opentypeModule.default.parse
        : null;

  if (!parser) {
    throw new Error("OpenType parser unavailable");
  }

  return parser;
}
