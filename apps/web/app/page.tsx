import { EmailIcon } from "@workspace/icons/email-icon";
import { InstagramIcon } from "@workspace/icons/instagram-icon";
import { XIcon } from "@workspace/icons/x-icon";
import { Text } from "@workspace/ui/components/text";

import { JsonLd } from "../components/json-ld";
import { LanguagePicker } from "../components/language-picker";
import { SocialLink } from "../components/social-link";
import { getTranslator } from "../messages/get-translator";
import { getRequestLocale } from "./get-request-locale";

export default async function Page() {
  const locale = await getRequestLocale();
  const translate = await getTranslator(locale);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://striedinger.co/#website",
        url: "https://striedinger.co",
        name: "Hugo Striedinger",
        publisher: { "@id": "https://striedinger.co/#person" },
        inLanguage: locale,
      },
      {
        "@type": "Person",
        "@id": "https://striedinger.co/#person",
        name: "Hugo Striedinger",
        url: "https://striedinger.co",
        jobTitle: translate("Senior Software Engineer"),
        sameAs: ["https://x.com/striedinger", "https://instagram.com/striedingerh"],
      },
    ],
  };

  return (
    <main className="flex min-h-svh flex-col items-center gap-10 font-serif">
      <JsonLd value={structuredData} />
      <section
        className="flex flex-col items-center gap-8 px-8 pt-28 text-center sm:pt-40"
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
            <span className="inline-block origin-[70%_70%] animate-wave motion-reduce:animate-none">
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

      <LanguagePicker locale={locale} label={translate("Select language")} />
    </main>
  );
}
