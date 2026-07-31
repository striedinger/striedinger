import type { MetadataRoute } from "next";

import { siteUrl } from "../lib/seo";

const lastModified = new Date("2026-07-30");

function createSitemapEntry(
  path: `/${string}` | "/",
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number,
): MetadataRoute.Sitemap[number] {
  const url = path === "/" ? siteUrl : `${siteUrl}${path}`;
  const imageUrl = path === "/" ? `${siteUrl}/opengraph-image` : `${url}/opengraph-image`;

  return {
    url,
    lastModified,
    changeFrequency,
    priority,
    images: [imageUrl],
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    createSitemapEntry("/", "monthly", 1),
    createSitemapEntry("/chat", "monthly", 0.8),
    createSitemapEntry("/drop", "monthly", 0.8),
    createSitemapEntry("/og", "monthly", 0.8),
    createSitemapEntry("/image", "monthly", 0.8),
    createSitemapEntry("/pdf", "monthly", 0.8),
    createSitemapEntry("/json", "monthly", 0.8),
    createSitemapEntry("/sudoku", "daily", 0.8),
    createSitemapEntry("/mta", "daily", 0.8),
    createSitemapEntry("/stocks", "daily", 0.8),
    createSitemapEntry("/podcasts", "daily", 0.8),
  ];
}
