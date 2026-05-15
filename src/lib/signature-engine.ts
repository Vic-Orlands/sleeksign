import { load } from "opentype.js";
import path from "path";

const FONTS = [
  "signature.ttf",
  "signature2.ttf",
  "signature3.ttf",
  "signature4.ttf",
];

export async function generateSignatureSVG(
  name: string,
  fontIndex: number = 0,
) {
  const selectedFont = FONTS[fontIndex] || FONTS[0];
  const fontPath = path.join(process.cwd(), "public/fonts", selectedFont);
  const font = await load(fontPath);

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
