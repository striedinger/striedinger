import { defineConfig } from "vitest/config";

export default defineConfig({
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
        test: {
          name: "web",
          root: "./apps/web",
          environment: "node",
          include: ["**/*.test.ts"],
        },
      },
      {
        test: {
          name: "web-ui",
          root: "./apps/web",
          environment: "jsdom",
          setupFiles: ["../../packages/ui/vitest.setup.ts"],
          include: ["components/**/*.test.tsx", "app/sudoku/**/*.test.tsx"],
        },
      },
    ],
  },
});
