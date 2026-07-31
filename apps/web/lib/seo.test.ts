import { describe, expect, it } from "vitest";

import { createPageMetadata, createWebApplicationStructuredData } from "./seo";

describe("SEO helpers", function () {
  it("creates canonical metadata with route-specific social images and full previews", function () {
    const metadata = createPageMetadata({
      title: "JSON Validator and Formatter",
      description: "Validate and format JSON privately.",
      locale: "en",
      path: "/json",
    });

    expect(metadata.alternates).toEqual({ canonical: "/json" });
    expect(metadata.openGraph).toMatchObject({
      locale: "en_US",
      url: "/json",
      images: [{ url: "/json/opengraph-image" }],
    });
    expect(metadata.twitter).toMatchObject({
      images: [{ url: "/json/opengraph-image" }],
    });
    expect(metadata.robots).toMatchObject({
      index: true,
      follow: true,
      googleBot: {
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    });
  });

  it("connects web applications to the site, creator, and breadcrumb trail", function () {
    const structuredData = createWebApplicationStructuredData({
      name: "JSON Validator and Formatter",
      description: "Validate and format JSON privately.",
      applicationCategory: "DeveloperApplication",
      featureList: ["JSON validation", "JSON formatting"],
      locale: "en",
      path: "/json",
    });

    expect(structuredData["@graph"]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          "@type": "WebApplication",
          "@id": "https://striedinger.co/json#application",
          isAccessibleForFree: true,
          inLanguage: "en",
        }),
        expect.objectContaining({
          "@type": "BreadcrumbList",
          "@id": "https://striedinger.co/json#breadcrumb",
        }),
      ]),
    );
  });
});
