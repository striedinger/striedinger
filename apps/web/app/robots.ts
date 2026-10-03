import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The link redirect logger is not content.
      disallow: "/r?",
    },
    sitemap: "https://striedinger.co/sitemap.xml",
    host: "https://striedinger.co",
  };
}
