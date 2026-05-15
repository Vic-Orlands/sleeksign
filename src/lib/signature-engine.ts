import { load } from "opentype.js";
import path from "path";

export async function generateSignatureSVG(name: string) {
  const fontPath = path.join(process.cwd(), "public/fonts/signature.ttf");
  const font = await load(fontPath);

  // Create a path for the name
  // fontSize: 72, x: 0, y: 50
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
