const siteUrl = "https://striedinger.co";
const key = "e7d86a7558d0fa83357473aaa5753b9c";
const keyLocation = `${siteUrl}/${key}.txt`;

const sitemapResponse = await fetch(`${siteUrl}/sitemap.xml`);

if (!sitemapResponse.ok) {
  throw new Error(`Could not load sitemap: ${sitemapResponse.status}`);
}

const sitemap = await sitemapResponse.text();
const urlList = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), function selectUrl(match) {
  return match[1];
}).filter(function isSiteUrl(url) {
  return url?.startsWith(siteUrl);
});

if (urlList.length === 0) {
  throw new Error("The sitemap did not contain any site URLs.");
}

const indexNowResponse = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    host: "striedinger.co",
    key,
    keyLocation,
    urlList,
  }),
});

if (!indexNowResponse.ok && indexNowResponse.status !== 202) {
  throw new Error(`IndexNow rejected the submission: ${indexNowResponse.status}`);
}

console.log(`Submitted ${urlList.length} URLs to IndexNow.`);
