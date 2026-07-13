const defaultAccentColor = "blue";

export const accentColorCookieName = "accent-color";

export const accentColors = [
  { id: "neutral", hue: 0, chroma: 0 },
  { id: "blue", hue: 258, chroma: 0.19 },
  { id: "violet", hue: 292, chroma: 0.17 },
  { id: "rose", hue: 348, chroma: 0.18 },
  { id: "orange", hue: 48, chroma: 0.16 },
  { id: "green", hue: 152, chroma: 0.14 },
  { id: "cyan", hue: 210, chroma: 0.13 },
] as const;

export type AccentColor = (typeof accentColors)[number];
export type AccentColorId = AccentColor["id"];

export function getAccentColor(value: string | undefined): AccentColor {
  const requestedAccentColor = accentColors.find(function matchesAccentColor(accentColor) {
    return accentColor.id === value;
  });

  if (requestedAccentColor) return requestedAccentColor;

  return accentColors.find(function matchesDefaultAccentColor(accentColor) {
    return accentColor.id === defaultAccentColor;
  })!;
}

export function getDefaultAccentColor(): AccentColor {
  return getAccentColor(defaultAccentColor);
}
