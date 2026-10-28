import "server-only";
import sharp from "sharp";

type FontWeight = 500 | 700;

interface ImageFont {
  name: string;
  data: ArrayBuffer;
  weight: FontWeight;
  style: "normal";
}

const requestTimeoutMs = 3_000;
// The backdrop is blurred at this width and scaled up, which blurs far more cheaply than
// filtering the full card.
const backdropSampleWidth = 32;
const maximumCachedFonts = 64;
// Inter matches the page's fallback for San Francisco. Scripts it does not cover load a Noto
// face, so a Japanese or Korean song title never renders as empty boxes.
const scriptFonts = [
  { family: "Noto Sans JP", pattern: /[぀-ヿ]/ },
  { family: "Noto Sans SC", pattern: /[一-鿿]/ },
  { family: "Noto Sans KR", pattern: /[가-힯]/ },
  { family: "Noto Sans Arabic", pattern: /[؀-ۿ]/ },
  { family: "Noto Sans Hebrew", pattern: /[֐-׿]/ },
  { family: "Noto Sans Thai", pattern: /[฀-๿]/ },
  { family: "Noto Sans Devanagari", pattern: /[ऀ-ॿ]/ },
];

// Subsets are keyed by their exact text, so a song's card reuses them until it changes.
const fontCache = new Map<string, Promise<ArrayBuffer | null>>();

/**
 * Fonts for the card image, each cut down by Google Fonts to only the characters it shows,
 * so a card downloads a few kilobytes instead of whole families. A font that fails to load is
 * left out, and the image falls back to the renderer's built-in face.
 */
export async function loadListeningImageFonts(textByWeight: Record<FontWeight, string>) {
  const requests = (Object.entries(textByWeight) as Array<[string, string]>).flatMap(
    function requestWeight([weightText, text]) {
      const weight = Number(weightText) as FontWeight;
      const families = [
        "Inter",
        ...scriptFonts
          .filter(function isNeeded(font) {
            return font.pattern.test(text);
          })
          .map(function getFamily(font) {
            return font.family;
          }),
      ];
      return families.map(async function loadFamily(family): Promise<ImageFont | null> {
        const data = await loadFontSubset(family, weight, text);
        return data ? { name: family, data, weight, style: "normal" } : null;
      });
    },
  );
  return (await Promise.all(requests)).filter(function isLoaded(font) {
    return font !== null;
  });
}

function loadFontSubset(family: string, weight: FontWeight, text: string) {
  const characters = [...new Set(text)].join("");
  const key = `${family}|${weight}|${characters}`;
  let font = fontCache.get(key);
  if (!font) {
    if (fontCache.size >= maximumCachedFonts) fontCache.clear();
    font = fetchFontSubset(family, weight, characters).then(function forgetFailure(data) {
      // A failed download is retried by the next image instead of being remembered.
      if (!data) fontCache.delete(key);
      return data;
    });
    fontCache.set(key, font);
  }
  return font;
}

async function fetchFontSubset(family: string, weight: FontWeight, characters: string) {
  try {
    const cssUrl = new URL("https://fonts.googleapis.com/css2");
    cssUrl.searchParams.set("family", `${family}:wght@${weight}`);
    cssUrl.searchParams.set("text", characters);
    const css = await fetchWithTimeout(cssUrl).then(function readCss(response) {
      return response.ok ? response.text() : "";
    });
    const fontUrl = css.match(
      /src: url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\) format\('(?:opentype|truetype)'\)/,
    )?.[1];
    if (!fontUrl) return null;
    const response = await fetchWithTimeout(fontUrl);
    return response.ok ? await response.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/**
 * The cover as a data URL plus a blurred backdrop made from the same download. The renderer
 * would fetch images itself with no time limit and blurs slowly and with visible banding, so
 * sharp blurs a tiny copy and scales it up smoothly instead. A slow or failed download leaves
 * the artwork out.
 */
export async function loadArtwork(url: string, backdropSize: { width: number; height: number }) {
  if (!url) return null;
  try {
    const response = await fetchWithTimeout(url);
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.startsWith("image/")) return null;
    const cover = Buffer.from(await response.arrayBuffer());
    // Two pipelines, because sharp runs only one resize per pipeline.
    const tinyBackdrop = await sharp(cover)
      .resize(
        backdropSampleWidth,
        Math.round((backdropSampleWidth * backdropSize.height) / backdropSize.width),
        {
          fit: "cover",
        },
      )
      .blur(1.5)
      .modulate({ saturation: 1.5 })
      .toBuffer();
    const backdrop = await sharp(tinyBackdrop)
      .resize(backdropSize.width, backdropSize.height, { kernel: "cubic" })
      .jpeg({ quality: 80 })
      .toBuffer();
    return {
      cover: `data:${contentType};base64,${cover.toString("base64")}`,
      backdrop: `data:image/jpeg;base64,${backdrop.toString("base64")}`,
    };
  } catch {
    return null;
  }
}

function fetchWithTimeout(url: string | URL) {
  return fetch(url, { cache: "no-store", signal: AbortSignal.timeout(requestTimeoutMs) });
}
