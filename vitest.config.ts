import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const serverOnlyAlias = fileURLToPath(new URL("./test/server-only.ts", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "server-only": serverOnlyAlias,
    },
  },
  test: {
    projects: [
      {
        test: {
          name: "ui",
          root: "./packages/ui",
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          include: ["src/**/*.test.tsx"],
        },
      },
      {
        test: {
          name: "i18n",
          root: "./packages/i18n",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        resolve: {
          alias: { "server-only": serverOnlyAlias },
        },
        test: {
          name: "web",
          root: "./apps/web",
          environment: "node",
          include: ["**/*.test.ts"],
        },
      },
      {
        resolve: {
          alias: { "server-only": serverOnlyAlias },
        },
        test: {
          name: "web-ui",
          root: "./apps/web",
          environment: "jsdom",
          setupFiles: ["../../packages/ui/vitest.setup.ts"],
          include: [
            "components/**/*.test.tsx",
            "app/chat/**/*.test.tsx",
            "app/drop/**/*.test.tsx",
            "app/podcasts/**/*.test.tsx",
            "app/stocks/**/*.test.tsx",
            "app/sudoku/**/*.test.tsx",
          ],
        },
      },
    ],
  },
});
