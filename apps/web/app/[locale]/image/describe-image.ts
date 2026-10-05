import { getImageDescriptionOptions } from "./image-description-options";

export interface ImageDescription {
  altText: string;
  /** A lowercase, hyphenated file name without an extension. */
  fileStem: string;
}

const descriptionSchema = {
  type: "object",
  properties: { altText: { type: "string" }, fileName: { type: "string" } },
  required: ["altText", "fileName"],
};

/** Writes alt text and a descriptive file name for an image with the on-device model. */
export async function describeImage(
  image: Blob,
  locale: string,
  { monitor, signal }: { monitor: (monitor: AICreateMonitor) => void; signal: AbortSignal },
): Promise<ImageDescription> {
  const session = await LanguageModel.create({
    ...getImageDescriptionOptions(locale),
    monitor,
    signal,
  });
  try {
    const language = new Intl.DisplayNames(["en"], { type: "language" }).of(locale) ?? "English";
    const response = await session.prompt(
      [
        {
          role: "user",
          content: [
            {
              type: "text",
              value: `Write alt text for this image in ${language}: one or two plain sentences describing what matters for someone who cannot see it, without starting with "Image of". Also suggest a short descriptive file name of two to five English words.`,
            },
            { type: "image", value: image },
          ],
        },
      ],
      { responseConstraint: descriptionSchema, signal },
    );
    const { altText, fileName } = JSON.parse(response) as { altText: string; fileName: string };
    return { altText: altText.trim(), fileStem: toFileStem(fileName) };
  } finally {
    session.destroy();
  }
}

export function toFileStem(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\.[a-z0-9]{2,5}$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/, "") || "image"
  );
}
