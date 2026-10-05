/**
 * Draws a caption the way the preview shows it: white semibold text on a rounded translucent
 * black box, centered near the bottom and wrapped to most of the frame's width.
 */
export function drawCaption(
  context: OffscreenCanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
) {
  const fontSize = Math.round(Math.max(14, Math.min(width, height) * 0.05));
  const lineHeight = Math.round(fontSize * 1.3);
  const padding = Math.round(fontSize * 0.45);
  const maxTextWidth = width * 0.84 - padding * 2;
  context.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";

  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > maxTextWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }
  if (lines.length === 0) return;

  const boxWidth =
    Math.min(
      maxTextWidth,
      Math.max(
        ...lines.map(function measureLine(line) {
          return context.measureText(line).width;
        }),
      ),
    ) +
    padding * 2;
  const boxHeight = lines.length * lineHeight + padding;
  const boxX = (width - boxWidth) / 2;
  const boxY = height * 0.93 - boxHeight;
  context.fillStyle = "rgba(0, 0, 0, 0.7)";
  context.beginPath();
  context.roundRect(boxX, boxY, boxWidth, boxHeight, Math.round(fontSize * 0.3));
  context.fill();
  context.fillStyle = "#ffffff";
  lines.forEach(function drawLine(line, index) {
    context.fillText(
      line,
      width / 2,
      boxY + padding / 2 + lineHeight * (index + 0.5),
      maxTextWidth,
    );
  });
}
