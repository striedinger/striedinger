import type { MetadataTag, PageMetadata } from "./types";

import { PreviewError } from "./preview-error";

const maximumTagValueLength = 4_096;
const maximumDocumentMetadataTags = 98;
// Real heads are a few kilobytes. The cap, together with patterns that stop at the next "<" and
// bounded repetitions, keeps every scan below linear in the input, so a hostile page cannot pin
// the CPU with an unterminated tag.
const maximumHeadLength = 131_072;
const metaTagPattern = /<meta\s[^<>]{0,2048}>/gi;
const linkTagPattern = /<link\s[^<>]{0,2048}>/gi;
const titleOpenTagPattern = /<title(?:\s[^<>]{0,2048})?>/i;
const titleCloseTagPattern = /<\/title\s{0,64}>/i;

export function parsePageMetadata(html: string, pageUrl: URL): PageMetadata {
  const [head = ""] = html.slice(0, maximumHeadLength).split(/<\/head\s{0,64}>/i, 1);
  const metadata = new Map<string, string>();
  const tags: MetadataTag[] = [];

  for (const tag of head.match(metaTagPattern) ?? []) {
    const attributes = parseAttributes(tag);
    const name = (
      attributes["property"] ??
      attributes["name"] ??
      attributes["http-equiv"] ??
      attributes["itemprop"] ??
      (attributes["charset"] ? "charset" : undefined)
    )?.toLowerCase();
    const content = (attributes["content"] ?? attributes["charset"])?.trim();

    if (!name || !content) {
      continue;
    }

    const value = decodeHtmlEntities(content).slice(0, maximumTagValueLength);

    if (!metadata.has(name)) {
      metadata.set(name, value);
    }

    if (tags.length < maximumDocumentMetadataTags) {
      tags.push({ name, value });
    }
  }

  const documentTitle = extractDocumentTitle(head);
  const canonicalUrl = resolveCanonicalUrl(head, pageUrl);
  const title = metadata.get("og:title") ?? documentTitle;
  const description = metadata.get("og:description") ?? metadata.get("description") ?? "";
  const twitterTitle = metadata.get("twitter:title") ?? title;
  const twitterDescription = metadata.get("twitter:description") ?? description;
  const image = resolveHttpUrl(
    metadata.get("og:image") ?? metadata.get("og:image:secure_url"),
    pageUrl,
  );
  const declaredTwitterImage = resolveHttpUrl(
    metadata.get("twitter:image") ?? metadata.get("twitter:image:src"),
    pageUrl,
  );
  const twitterImage = isXPage(pageUrl)
    ? image || declaredTwitterImage
    : declaredTwitterImage || image;

  if (!title && !description && !image) {
    throw new PreviewError("missing-metadata");
  }

  if (
    documentTitle &&
    !tags.some(function hasDocumentTitle(tag) {
      return tag.name === "title";
    })
  ) {
    tags.push({ name: "title", value: documentTitle.slice(0, maximumTagValueLength) });
  }

  if (
    !tags.some(function hasCanonicalUrl(tag) {
      return tag.name === "canonical";
    })
  ) {
    tags.push({ name: "canonical", value: canonicalUrl.slice(0, maximumTagValueLength) });
  }

  return {
    canonicalUrl,
    description,
    image,
    siteName: metadata.get("og:site_name") ?? pageUrl.hostname,
    title,
    twitterCard: metadata.get("twitter:card") ?? "summary_large_image",
    twitterDescription,
    twitterImage,
    twitterTitle,
    tags,
  };
}

function isXPage(pageUrl: URL): boolean {
  const hostname = pageUrl.hostname.toLowerCase();

  return (
    hostname === "x.com" ||
    hostname.endsWith(".x.com") ||
    hostname === "twitter.com" ||
    hostname.endsWith(".twitter.com")
  );
}

function parseAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const attributePattern = /([\w:-]{1,64})\s{0,64}=\s{0,64}(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;

  for (const [, name, doubleQuoted, singleQuoted, unquoted] of tag.matchAll(attributePattern)) {
    if (name) attributes[name.toLowerCase()] = doubleQuoted ?? singleQuoted ?? unquoted ?? "";
  }

  return attributes;
}

function extractDocumentTitle(head: string): string {
  const openTag = titleOpenTagPattern.exec(head);
  if (!openTag) return "";

  // Searching for the closing tag once, after the first opening tag, stays linear where a lazy
  // capture would rescan the rest of the head from every unclosed "<title".
  const titleAndRest = head.slice(openTag.index + openTag[0].length);
  const closeTagIndex = titleAndRest.search(titleCloseTagPattern);
  const title = closeTagIndex === -1 ? "" : titleAndRest.slice(0, closeTagIndex);
  return title ? decodeHtmlEntities(title.replace(/\s+/g, " ").trim()) : "";
}

function resolveCanonicalUrl(head: string, pageUrl: URL): string {
  for (const tag of head.match(linkTagPattern) ?? []) {
    const attributes = parseAttributes(tag);

    if (attributes["rel"]?.toLowerCase() === "canonical") {
      return resolveHttpUrl(attributes["href"], pageUrl) || pageUrl.toString();
    }
  }

  return pageUrl.toString();
}

function resolveHttpUrl(value: string | undefined, baseUrl: URL): string {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(decodeHtmlEntities(value), baseUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Readonly<Record<string, string>> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: '"',
  };

  return value.replace(
    /&(#x?[\da-f]{1,8}|[a-z]{1,32});/gi,
    function decodeEntity(entity: string, code: string) {
      if (!code.startsWith("#")) return namedEntities[code.toLowerCase()] ?? entity;

      const codePoint =
        code.startsWith("#x") || code.startsWith("#X")
          ? Number.parseInt(code.slice(2), 16)
          : // oxlint-disable-next-line unicorn/prefer-number-coercion -- parseInt stops at the first non-decimal digit the hex-tolerant pattern allows, where Number() would give NaN
            Number.parseInt(code.slice(1), 10);
      // A page's out-of-range entity stays as written instead of failing the whole preview.
      return codePoint <= 0x10_ffff ? String.fromCodePoint(codePoint) : entity;
    },
  );
}
