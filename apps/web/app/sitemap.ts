import type { MetadataRoute } from "next";

const siteUrl = "https://striedinger.co";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "monthly", priority: 1 },
    { url: `${siteUrl}/chat`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/og`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/drop`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/json`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/image`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/pdf`, changeFrequency: "monthly", priority: 0.8 },
    {
      url: `${siteUrl}/sudoku`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    { url: `${siteUrl}/mta`, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/stocks`, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/podcasts`, changeFrequency: "daily", priority: 0.8 },
  ];
}
