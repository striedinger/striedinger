import { EmailIcon } from "@workspace/icons/email-icon";
import { InstagramIcon } from "@workspace/icons/instagram-icon";
import { XIcon } from "@workspace/icons/x-icon";
import { Text } from "@workspace/ui/components/text";
import Link from "next/link";

import { JsonLd } from "../components/json-ld";
import { LanguagePicker } from "../components/language-picker";
import { SocialLink } from "../components/social-link";
import { localizePath } from "../lib/locale-path";
import { personId, siteUrl, websiteId } from "../lib/seo";
import { getTranslator } from "../messages/get-translator";
import { getRequestLocale } from "./get-request-locale";

export default async function Page() {
  const locale = await getRequestLocale();
  const translate = await getTranslator(locale);
  const localizedHomePath = localizePath("/", locale);
  const profileUrl = localizedHomePath === "/" ? siteUrl : `${siteUrl}${localizedHomePath}`;
  const toolLinks = [
    { href: "/image", label: translate("Image Optimizer") },
    { href: "/pdf", label: translate("PDF Optimizer") },
    { href: "/json", label: translate("JSON Validator and Formatter") },
    { href: "/og", label: translate("Open Graph Preview") },
    { href: "/drop", label: translate("Drop - Private file sharing") },
    { href: "/chat", label: translate("Nearby Chat") },
    { href: "/sudoku", label: translate("Daily Sudoku") },
    { href: "/mta", label: translate("Trains near you") },
    { href: "/stocks", label: translate("Stock watchlist") },
    { href: "/podcasts", label: translate("Podcasts") },
  ] as const;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: siteUrl,
        name: "Hugo Striedinger",
        description: translate(
          "Hugo Striedinger is a Colombian-born senior software engineer based in New York, with experience at SpaceX, Twitter Inc., and X Corp.",
        ),
        publisher: { "@id": personId },
        inLanguage: locale,
      },
      {
        "@type": "Person",
        "@id": personId,
        name: "Hugo Striedinger",
        givenName: "Hugo",
        familyName: "Striedinger",
        url: siteUrl,
        jobTitle: translate("Senior Software Engineer"),
        homeLocation: {
          "@type": "Place",
          name: translate("New York, NY"),
        },
        sameAs: [
          "https://github.com/striedinger",
          "https://www.linkedin.com/in/striedinger",
          "https://x.com/striedinger",
          "https://instagram.com/striedingerh",
        ],
      },
      {
        "@type": "ProfilePage",
        "@id": `${profileUrl}#profile`,
        url: profileUrl,
        name: translate("Hugo Striedinger - Senior Software Engineer"),
        isPartOf: { "@id": websiteId },
        mainEntity: { "@id": personId },
        inLanguage: locale,
      },
    ],
  };

  return (
    <main className="flex min-h-svh flex-col items-center gap-12 px-6 pb-20 font-sans">
      <JsonLd value={structuredData} />
      <section
        className="flex flex-col items-center gap-8 pt-28 text-center sm:pt-40"
        aria-labelledby="introduction-heading"
      >
        <Text
          as="h1"
          id="introduction-heading"
          size="3xl"
          weight="bold"
          className="leading-[1.2] sm:text-[2rem]"
        >
          <span className="inline-block whitespace-pre-wrap">
            {translate("Hi there!")}{" "}
            <span className="inline-block origin-[70%_70%] hover:animate-wave motion-reduce:animate-none">
              👋
            </span>{" "}
          </span>
          <span className="inline-block whitespace-pre-wrap">
            {translate("I'm Hugo Striedinger")}
          </span>
        </Text>

        <Text as="h2" size="2xl" weight="bold" className="leading-tight">
          {translate("Senior Software Engineer")}
        </Text>

        <Text size="lg" weight="bold">
          <a
            className="text-inherit underline underline-offset-[0.16em]"
            href="https://www.spacex.com"
            target="_blank"
            rel="noreferrer"
          >
            SpaceX
          </a>{" "}
          / Twitter Inc. /{" "}
          <a
            className="text-inherit underline underline-offset-[0.16em]"
            href="https://x.com"
            target="_blank"
            rel="noreferrer"
          >
            X Corp.
          </a>
        </Text>

        <Text weight="bold">📍 {translate("New York, NY")}</Text>
      </section>

      <ul
        className="flex list-none justify-center gap-4 p-0"
        aria-label={translate("Social links")}
      >
        <li>
          <SocialLink
            href="mailto:striedinger+www@outlook.com"
            label={translate("Email Hugo Striedinger")}
          >
            <EmailIcon />
          </SocialLink>
        </li>
        <li>
          <SocialLink
            href="https://x.com/striedinger"
            label={translate("Hugo Striedinger on X")}
            external
          >
            <XIcon />
          </SocialLink>
        </li>
        <li>
          <SocialLink
            href="https://instagram.com/striedingerh"
            label={translate("Hugo Striedinger on Instagram")}
            external
          >
            <InstagramIcon />
          </SocialLink>
        </li>
      </ul>

      <nav aria-label={translate("Social links")}>
        <ul className="flex list-none flex-wrap justify-center gap-5 p-0">
          <li>
            <Text
              as="a"
              href="https://github.com/striedinger"
              target="_blank"
              rel="noreferrer"
              size="sm"
              weight="semibold"
              className="underline underline-offset-4"
            >
              {translate("Hugo Striedinger on GitHub")}
            </Text>
          </li>
          <li>
            <Text
              as="a"
              href="https://www.linkedin.com/in/striedinger"
              target="_blank"
              rel="noreferrer"
              size="sm"
              weight="semibold"
              className="underline underline-offset-4"
            >
              {translate("Hugo Striedinger on LinkedIn")}
            </Text>
          </li>
        </ul>
      </nav>

      <LanguagePicker locale={locale} label={translate("Select language")} />

      <section
        className="flex w-full max-w-4xl flex-col gap-5 border-t border-border/70 pt-12"
        aria-labelledby="about-heading"
      >
        <Text as="h2" id="about-heading" size="2xl" weight="semibold">
          {translate("About Hugo")}
        </Text>
        <Text tone="muted" className="max-w-3xl leading-relaxed">
          {translate(
            "Hugo Striedinger is a Colombian-born senior software engineer based in New York, with experience at SpaceX, Twitter Inc., and X Corp.",
          )}
        </Text>
        <Text tone="muted" className="max-w-3xl leading-relaxed">
          {translate(
            "I build fast, accessible web products and developer tools with a focus on privacy, reliability, and thoughtful user experience.",
          )}
        </Text>
      </section>

      <section
        className="flex w-full max-w-4xl flex-col gap-6 border-t border-border/70 pt-12"
        aria-labelledby="tools-heading"
      >
        <div className="flex flex-col gap-3">
          <Text as="h2" id="tools-heading" size="2xl" weight="semibold">
            {translate("Browser tools")}
          </Text>
          <Text tone="muted">
            {translate("Free, privacy-focused browser tools and live utilities.")}
          </Text>
        </div>
        <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {toolLinks.map(function renderToolLink(tool) {
            return (
              <li key={tool.href}>
                <Text
                  as={Link}
                  href={localizePath(tool.href, locale)}
                  weight="semibold"
                  className="block h-full rounded-2xl border border-border/70 bg-card/60 p-5 transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-accent motion-reduce:transform-none motion-reduce:transition-none"
                >
                  {tool.label}
                </Text>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
