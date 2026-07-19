const defaultThemeId = "default";

export const themeCookieName = "theme";

export const themes = [
  {
    id: "default",
    title: "Editorial",
    primaryLight: "oklch(0.51 0.19 258)",
    primaryDark: "oklch(0.72 0.19 258)",
  },
  {
    id: "amber-minimal",
    title: "Amber Minimal",
    primaryLight: "oklch(0.77 0.16 70.08)",
    primaryDark: "oklch(0.77 0.16 70.08)",
  },
  {
    id: "bold-tech",
    title: "Bold Tech",
    primaryLight: "oklch(0.61 0.22 292.72)",
    primaryDark: "oklch(0.61 0.22 292.72)",
  },
  {
    id: "bubblegum",
    title: "Bubblegum",
    primaryLight: "oklch(0.62 0.18 348.14)",
    primaryDark: "oklch(0.92 0.08 87.67)",
  },
  {
    id: "caffeine",
    title: "Caffeine",
    primaryLight: "oklch(0.43 0.04 41.99)",
    primaryDark: "oklch(0.92 0.05 66.17)",
  },
  {
    id: "candyland",
    title: "Candyland",
    primaryLight: "oklch(0.87 0.07 7.09)",
    primaryDark: "oklch(0.8 0.14 349.23)",
  },
  {
    id: "catppuccin",
    title: "Catppuccin",
    primaryLight: "oklch(0.55 0.25 297.02)",
    primaryDark: "oklch(0.79 0.12 304.77)",
  },
  {
    id: "claude",
    title: "Claude",
    primaryLight: "oklch(0.62 0.14 39.04)",
    primaryDark: "oklch(0.67 0.13 38.76)",
  },
  {
    id: "claymorphism",
    title: "Claymorphism",
    primaryLight: "oklch(0.59 0.2 277.12)",
    primaryDark: "oklch(0.68 0.16 276.93)",
  },
  {
    id: "clean-slate",
    title: "Clean Slate",
    primaryLight: "oklch(0.59 0.2 277.12)",
    primaryDark: "oklch(0.68 0.16 276.93)",
  },
  {
    id: "cosmic-night",
    title: "Cosmic Night",
    primaryLight: "oklch(0.54 0.18 288.03)",
    primaryDark: "oklch(0.72 0.16 290.4)",
  },
  {
    id: "cyberpunk",
    title: "Cyberpunk",
    primaryLight: "oklch(0.67 0.29 341.41)",
    primaryDark: "oklch(0.67 0.29 341.41)",
  },
  {
    id: "doom-64",
    title: "Doom 64",
    primaryLight: "oklch(0.5 0.19 27.48)",
    primaryDark: "oklch(0.61 0.21 27.03)",
  },
  {
    id: "elegant-luxury",
    title: "Elegant Luxury",
    primaryLight: "oklch(0.47 0.15 24.94)",
    primaryDark: "oklch(0.51 0.19 27.52)",
  },
  {
    id: "graphite",
    title: "Graphite",
    primaryLight: "oklch(0.49 0 0)",
    primaryDark: "oklch(0.71 0 0)",
  },
  {
    id: "kodama-grove",
    title: "Kodama Grove",
    primaryLight: "oklch(0.67 0.11 118.91)",
    primaryDark: "oklch(0.68 0.06 132.45)",
  },
  {
    id: "midnight-bloom",
    title: "Midnight Bloom",
    primaryLight: "oklch(0.57 0.2 283.08)",
    primaryDark: "oklch(0.57 0.2 283.08)",
  },
  {
    id: "mocha-mousse",
    title: "Mocha Mousse",
    primaryLight: "oklch(0.61 0.06 44.36)",
    primaryDark: "oklch(0.73 0.05 52.33)",
  },
  {
    id: "modern-minimal",
    title: "Modern Minimal",
    primaryLight: "oklch(0.62 0.19 259.81)",
    primaryDark: "oklch(0.62 0.19 259.81)",
  },
  {
    id: "mono",
    title: "Mono",
    primaryLight: "oklch(0.56 0 0)",
    primaryDark: "oklch(0.56 0 0)",
  },
  {
    id: "nature",
    title: "Nature",
    primaryLight: "oklch(0.52 0.13 144.17)",
    primaryDark: "oklch(0.67 0.16 144.21)",
  },
  {
    id: "neo-brutalism",
    title: "Neo Brutalism",
    primaryLight: "oklch(0.65 0.24 26.97)",
    primaryDark: "oklch(0.7 0.19 23.19)",
  },
  {
    id: "northern-lights",
    title: "Northern Lights",
    primaryLight: "oklch(0.65 0.15 150.31)",
    primaryDark: "oklch(0.65 0.15 150.31)",
  },
  {
    id: "ocean-breeze",
    title: "Ocean Breeze",
    primaryLight: "oklch(0.72 0.19 149.58)",
    primaryDark: "oklch(0.77 0.15 163.22)",
  },
  {
    id: "pastel-dreams",
    title: "Pastel Dreams",
    primaryLight: "oklch(0.71 0.16 293.54)",
    primaryDark: "oklch(0.79 0.12 295.75)",
  },
  {
    id: "perpetuity",
    title: "Perpetuity",
    primaryLight: "oklch(0.56 0.09 203.28)",
    primaryDark: "oklch(0.85 0.13 195.04)",
  },
  {
    id: "quantum-rose",
    title: "Quantum Rose",
    primaryLight: "oklch(0.6 0.24 0.13)",
    primaryDark: "oklch(0.75 0.23 332.02)",
  },
  {
    id: "retro-arcade",
    title: "Retro Arcade",
    primaryLight: "oklch(0.59 0.2 355.89)",
    primaryDark: "oklch(0.59 0.2 355.89)",
  },
  {
    id: "solar-dusk",
    title: "Solar Dusk",
    primaryLight: "oklch(0.56 0.15 49)",
    primaryDark: "oklch(0.7 0.19 47.6)",
  },
  {
    id: "starry-night",
    title: "Starry Night",
    primaryLight: "oklch(0.48 0.12 263.38)",
    primaryDark: "oklch(0.48 0.12 263.38)",
  },
  {
    id: "supabase",
    title: "Supabase",
    primaryLight: "oklch(0.83 0.13 160.91)",
    primaryDark: "oklch(0.44 0.1 156.76)",
  },
  {
    id: "sunset-horizon",
    title: "Sunset Horizon",
    primaryLight: "oklch(0.74 0.16 34.71)",
    primaryDark: "oklch(0.74 0.16 34.71)",
  },
  {
    id: "t3-chat",
    title: "T3 Chat",
    primaryLight: "oklch(0.53 0.14 355.2)",
    primaryDark: "oklch(0.46 0.19 4.1)",
  },
  {
    id: "tangerine",
    title: "Tangerine",
    primaryLight: "oklch(0.64 0.17 36.44)",
    primaryDark: "oklch(0.64 0.17 36.44)",
  },
  {
    id: "twitter",
    title: "Twitter",
    primaryLight: "oklch(0.67 0.16 245)",
    primaryDark: "oklch(0.67 0.16 245.01)",
  },
  {
    id: "vercel",
    title: "Vercel",
    primaryLight: "oklch(0 0 0)",
    primaryDark: "oklch(1 0 0)",
  },
  {
    id: "vintage-paper",
    title: "Vintage Paper",
    primaryLight: "oklch(0.62 0.08 65.54)",
    primaryDark: "oklch(0.73 0.06 66.7)",
  },
  {
    id: "twitch",
    title: "Twitch",
    primaryLight: "oklch(0.54 0.24 292)",
    primaryDark: "oklch(0.6 0.22 292)",
  },
  {
    id: "kick",
    title: "Kick",
    primaryLight: "oklch(0.75 0.26 135)",
    primaryDark: "oklch(0.83 0.28 135)",
  },
  {
    id: "spotify",
    title: "Spotify",
    primaryLight: "oklch(0.64 0.2 155)",
    primaryDark: "oklch(0.68 0.2 155)",
  },
  {
    id: "stripe",
    title: "Stripe",
    primaryLight: "oklch(0.55 0.24 280)",
    primaryDark: "oklch(0.65 0.22 280)",
  },
  {
    id: "github",
    title: "GitHub",
    primaryLight: "oklch(0.52 0.16 145)",
    primaryDark: "oklch(0.62 0.16 145)",
  },
  {
    id: "windows98",
    title: "Windows 98",
    primaryLight: "oklch(0.2711 0.1879 264.052)",
    primaryDark: "oklch(0.2711 0.1879 264.052)",
  },
] as const;

export type Theme = (typeof themes)[number];
export type ThemeId = Theme["id"];

export const sortedThemes = [
  themes[0],
  ...themes.slice(1).toSorted(function compareThemeTitles(leftTheme, rightTheme) {
    return leftTheme.title.localeCompare(rightTheme.title);
  }),
];

export function getTheme(value: string | undefined): Theme {
  return (
    themes.find(function matchesTheme(theme) {
      return theme.id === value;
    }) ??
    themes.find(function matchesDefaultTheme(theme) {
      return theme.id === defaultThemeId;
    })!
  );
}
