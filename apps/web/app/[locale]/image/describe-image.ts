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

export interface ImageTextTranslation {
  /** The text as written in the image; empty when it has none. */
  text: string;
  translation: string;
}

const textTranslationSchema = {
  type: "object",
  properties: {
    hasText: { type: "boolean" },
    text: { type: "string" },
    translation: { type: "string" },
  },
  required: ["hasText", "text", "translation"],
};

/** Reads any writing in the image, such as a sign or a menu, and translates it. */
export async function translateImageText(
  image: Blob,
  locale: string,
  { monitor, signal }: { monitor: (monitor: AICreateMonitor) => void; signal: AbortSignal },
): Promise<ImageTextTranslation> {
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
              value: `Find the written text in this image, such as signs, labels, or menus. If there is none, set hasText to false and leave the other fields empty. Otherwise copy the text exactly as written into "text", keeping line breaks, and translate it into ${language} in "translation".`,
            },
            { type: "image", value: image },
          ],
        },
      ],
      { responseConstraint: textTranslationSchema, signal },
    );
    const result = JSON.parse(response) as { hasText: boolean; text: string; translation: string };
    return result.hasText && result.text.trim()
      ? { text: result.text.trim(), translation: result.translation.trim() }
      : { text: "", translation: "" };
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
