// Constructing Intl formatters is expensive, and list rows format dates and durations on every
// render. Formatters are cached per locale and option set.
const formatterCache = new Map<string, unknown>();

function getCachedFormatter<Formatter>(key: string, create: () => Formatter): Formatter {
  let formatter = formatterCache.get(key) as Formatter | undefined;
  if (!formatter) {
    formatter = create();
    formatterCache.set(key, formatter);
  }
  return formatter;
}

export function getNumberFormat(locale: string, options: Intl.NumberFormatOptions) {
  return getCachedFormatter(
    `number|${locale}|${JSON.stringify(options)}`,
    function createNumberFormat() {
      return new Intl.NumberFormat(locale, options);
    },
  );
}

export function getDateTimeFormat(locale: string, options: Intl.DateTimeFormatOptions) {
  return getCachedFormatter(
    `date|${locale}|${JSON.stringify(options)}`,
    function createDateTimeFormat() {
      return new Intl.DateTimeFormat(locale, options);
    },
  );
}

export function getRelativeTimeFormat(locale: string, options: Intl.RelativeTimeFormatOptions) {
  return getCachedFormatter(
    `relative|${locale}|${JSON.stringify(options)}`,
    function createRelativeTimeFormat() {
      return new Intl.RelativeTimeFormat(locale, options);
    },
  );
}

export function getCollator(locale: string, options: Intl.CollatorOptions) {
  return getCachedFormatter(
    `collator|${locale}|${JSON.stringify(options)}`,
    function createCollator() {
      return new Intl.Collator(locale, options);
    },
  );
}
