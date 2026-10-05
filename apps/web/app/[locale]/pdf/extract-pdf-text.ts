/* oxlint-disable no-await-in-loop -- Read one page at a time and stop once there is enough text. */

/** The on-device summarizer reads only a few pages' worth of text, so reading stops here. */
const maximumCharacters = 16_000;

/** Reads the document's text layer with pdf.js, in page order, up to a summary's worth. */
export async function extractPdfText(file: File, password: string) {
  const [pdfjs, buffer] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    file.arrayBuffer(),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    password: password || undefined,
  });
  try {
    const document = await loadingTask.promise;
    let text = "";
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      for (const item of content.items) {
        if ("str" in item) text += item.str + (item.hasEOL ? "\n" : " ");
      }
      text += "\n";
      page.cleanup();
      if (text.length >= maximumCharacters) break;
    }
    return text
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, maximumCharacters);
  } finally {
    await loadingTask.destroy();
  }
}
