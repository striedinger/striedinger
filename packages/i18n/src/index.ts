export const supportedLocales = ["en", "es", "de", "it", "fr", "pt", "zh", "ja"] as const;

export type Locale = (typeof supportedLocales)[number];
export type MessageCatalog = Readonly<Record<string, string>>;
export type TranslationCatalog<SourceCatalog extends MessageCatalog> = Readonly<{
  [Message in keyof SourceCatalog]: string;
}>;

export const localeCookieName = "locale";

export function defineMessages<const Catalog extends MessageCatalog>(catalog: Catalog): Catalog {
  return catalog;
}

export function composeCatalogs<const Catalogs extends readonly MessageCatalog[]>(
  ...catalogs: Catalogs
): UnionToIntersection<Catalogs[number]> {
  return Object.assign({}, ...catalogs) as unknown as UnionToIntersection<Catalogs[number]>;
}

export function createTranslator<Catalog extends MessageCatalog>(catalog: Catalog) {
  return function translate<Message extends keyof Catalog>(message: Message): Catalog[Message] {
    return catalog[message];
  };
}

export function isLocale(locale: string): locale is Locale {
  return supportedLocales.some(function matchesSupportedLocale(supportedLocale) {
    return supportedLocale === locale;
  });
}

export function resolveLocale(languageTags: readonly string[]): Locale {
  for (const languageTag of languageTags) {
    const normalizedLocale = languageTag.toLowerCase().split("-")[0];

    if (isLocale(normalizedLocale)) {
      return normalizedLocale;
    }
  }

  return "en";
}

type UnionToIntersection<Union> = (
  Union extends unknown ? (value: Union) => void : never
) extends (value: infer Intersection) => void
  ? Intersection
  : never;
