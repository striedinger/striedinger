import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Theme presets ship as separate stylesheets so each visitor downloads only the theme they
// use. The Editorial default stays in the global stylesheet.
const sourceDirectory = fileURLToPath(
  new URL("../../../packages/ui/src/styles/themes/", import.meta.url),
);
const outputDirectory = fileURLToPath(new URL("../public/themes/", import.meta.url));

function minifyCss(css) {
  return css
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .replaceAll(/\s+/g, " ")
    .replaceAll(/\s*([{}:;,>])\s*/g, "$1")
    .replaceAll(";}", "}")
    .trim();
}

const themeFiles = (await readdir(sourceDirectory)).filter(function isThemePreset(fileName) {
  return fileName.endsWith(".css") && fileName !== "index.css";
});

await mkdir(outputDirectory, { recursive: true });
await Promise.all(
  themeFiles.map(async function copyTheme(fileName) {
    const css = await readFile(new URL(fileName, `file://${sourceDirectory}`), "utf8");
    await writeFile(new URL(fileName, `file://${outputDirectory}`), `${minifyCss(css)}\n`);
  }),
);
