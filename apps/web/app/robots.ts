import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://striedinger.co/sitemap.xml",
    host: "https://striedinger.co",
  };
}
