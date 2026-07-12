import { PreviewError } from "./preview-error";
import type { MetadataTag, PageMetadata } from "./types";

const maximumTagValueLength = 4_096;
const maximumDocumentMetadataTags = 98;

export function parsePageMetadata(html: string, pageUrl: URL): PageMetadata {
  const head = html.split(/<\/head\s*>/i, 1)[0];
  const metadata = new Map<string, string>();
  const tags: MetadataTag[] = [];

  for (const tag of head.match(/<meta\s+[^>]*>/gi) ?? []) {
    const attributes = parseAttributes(tag);
    const name = (
      attributes.property ??
      attributes.name ??
      attributes["http-equiv"] ??
      attributes.itemprop ??
      (attributes.charset ? "charset" : undefined)
    )?.toLowerCase();
    const content = (attributes.content ?? attributes.charset)?.trim();

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
  const twitterImage = isXPage(pageUrl) ? image || declaredTwitterImage : declaredTwitterImage || image;

  if (!title && !description && !image) {
    throw new PreviewError("missing-metadata");
  }

  if (documentTitle && !tags.some(function hasDocumentTitle(tag) {
    return tag.name === "title";
  })) {
    tags.push({ name: "title", value: documentTitle.slice(0, maximumTagValueLength) });
  }

  if (!tags.some(function hasCanonicalUrl(tag) {
    return tag.name === "canonical";
  })) {
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
  const attributePattern = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;

  for (const match of tag.matchAll(attributePattern)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }

  return attributes;
}

function extractDocumentTitle(head: string): string {
  const match = head.match(/<title[^>]*>([\s\S]*?)<\/title\s*>/i);
  return match ? decodeHtmlEntities(match[1].replace(/\s+/g, " ").trim()) : "";
}

function resolveCanonicalUrl(head: string, pageUrl: URL): string {
  for (const tag of head.match(/<link\s+[^>]*>/gi) ?? []) {
    const attributes = parseAttributes(tag);

    if (attributes.rel?.toLowerCase() === "canonical") {
      return resolveHttpUrl(attributes.href, pageUrl) || pageUrl.toString();
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

  return value.replace(/&(#x?[\da-f]+|[a-z]+);/gi, function decodeEntity(_entity, code) {
    if (code.startsWith("#x") || code.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    }

    if (code.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    }

    return namedEntities[code.toLowerCase()] ?? _entity;
  });
}
