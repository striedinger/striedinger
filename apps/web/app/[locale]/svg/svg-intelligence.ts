import { exportSvgAsPng } from "./export-svg-png";
import { inspectSvg } from "./inspect-svg";
import { getSvgDescribeOptions, getSvgEditOptions } from "./svg-intelligence-options";

const editInstructions =
  "You edit SVG documents. Apply the requested change and return the complete updated SVG document. Keep everything the request does not mention, including the root element's xmlns, width, height, and viewBox. Never add scripts, event handler attributes, or external references.";

const svgResultSchema = {
  type: "object",
  properties: { svg: { type: "string" } },
  required: ["svg"],
};

const descriptionSchema = {
  type: "object",
  properties: { description: { type: "string" }, title: { type: "string" } },
  required: ["title", "description"],
};

interface SvgRequestContext {
  monitor: (monitor: AICreateMonitor) => void;
  signal: AbortSignal;
}

/** Asks the model to apply a change, then checks that the answer is still a valid SVG. */
export async function editSvgWithModel(
  source: string,
  request: string,
  locale: string,
  { monitor, signal }: SvgRequestContext,
) {
  const session = await LanguageModel.create({
    ...getSvgEditOptions(locale),
    initialPrompts: [{ role: "system", content: editInstructions }],
    monitor,
    signal,
  });
  try {
    const response = await session.prompt(`Request: ${request}\n\nSVG document:\n${source}`, {
      responseConstraint: svgResultSchema,
      signal,
    });
    const { svg } = JSON.parse(response) as { svg: string };
    if (inspectSvg(svg).status !== "valid") throw new Error("The model returned invalid SVG");
    return svg.trim() + "\n";
  } finally {
    session.destroy();
  }
}

/** Looks at the rendered drawing and writes an accessible title and description into it. */
export async function describeSvgWithModel(
  source: string,
  locale: string,
  { width, height }: { width: number | null; height: number | null },
  { monitor, signal }: SvgRequestContext,
) {
  const session = await LanguageModel.create({
    ...getSvgDescribeOptions(locale),
    monitor,
    signal,
  });
  try {
    const image = await exportSvgAsPng(source, width, height);
    const language = new Intl.DisplayNames(["en"], { type: "language" }).of(locale) ?? "English";
    const response = await session.prompt(
      [
        {
          role: "user",
          content: [
            {
              type: "text",
              value: `Write a short title (at most six words) and a one-sentence description of this image for people who cannot see it. Write both in ${language}.`,
            },
            { type: "image", value: image },
          ],
        },
      ],
      { responseConstraint: descriptionSchema, signal },
    );
    const { description, title } = JSON.parse(response) as { description: string; title: string };
    return insertTitleAndDescription(source, title.trim(), description.trim());
  } finally {
    session.destroy();
  }
}

/** Puts `<title>` and `<desc>` first inside the root element, replacing any already there. */
export function insertTitleAndDescription(source: string, title: string, description: string) {
  const openingTag = /<svg\b[^>]*>/i.exec(source);
  if (!openingTag) return source;
  const insertAt = openingTag.index + openingTag[0].length;
  const body = source
    .slice(insertAt)
    .replace(/^\s*<title\b[^>]*>[\s\S]*?<\/title>/i, "")
    .replace(/^\s*<desc\b[^>]*>[\s\S]*?<\/desc>/i, "");
  return `${source.slice(0, insertAt)}\n  <title>${escapeXml(title)}</title>\n  <desc>${escapeXml(description)}</desc>${body}`;
}

function escapeXml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
