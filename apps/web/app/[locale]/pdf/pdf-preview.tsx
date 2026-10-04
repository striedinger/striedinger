"use client";

import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";

import { Text } from "@workspace/ui/components/text";
import { useEffect, useState } from "react";

import type { PdfToolLabels } from "./types";

import { PdfPreviewPage } from "./pdf-preview-page";

interface PdfPreviewProps {
  file: File;
  labels: PdfToolLabels;
  onPasswordResult: (requiresPassword: boolean, isValid: boolean) => void;
  password: string;
}

interface PageSize {
  height: number;
  pageNumber: number;
  width: number;
}

export function PdfPreview({ file, labels, onPasswordResult, password }: PdfPreviewProps) {
  const [document, setDocument] = useState<PDFDocumentProxy>();
  const [pageSizes, setPageSizes] = useState<PageSize[]>([]);
  const [status, setStatus] = useState<"error" | "loading" | "ready">("loading");
  const [error, setError] = useState("");

  useEffect(
    function loadPreview() {
      let cancelled = false;
      let loadingTask: PDFDocumentLoadingTask | undefined;

      async function load() {
        setStatus("loading");
        setError("");
        setDocument(undefined);
        setPageSizes([]);
        try {
          // The legacy build polyfills recent JavaScript (such as Map#getOrInsertComputed) that
          // pdf.js 6's default build assumes, so PDFs open in current Safari and Chromium releases.
          const [pdfjs, buffer] = await Promise.all([
            import("pdfjs-dist/legacy/build/pdf.mjs"),
            file.arrayBuffer(),
          ]);
          if (cancelled) return;
          pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
            import.meta.url,
          ).toString();
          loadingTask = pdfjs.getDocument({
            data: new Uint8Array(buffer),
            password: password || undefined,
          });
          const loadedDocument = await loadingTask.promise;
          if (cancelled) return;

          const sizes = await Promise.all(
            Array.from({ length: loadedDocument.numPages }, async function measurePage(_, index) {
              const page = await loadedDocument.getPage(index + 1);
              const viewport = page.getViewport({ scale: 1 });
              page.cleanup();
              return { height: viewport.height, pageNumber: index + 1, width: viewport.width };
            }),
          );
          if (cancelled) return;

          onPasswordResult(Boolean(password), true);
          setDocument(loadedDocument);
          setPageSizes(sizes);
          setStatus("ready");
        } catch (cause) {
          await loadingTask?.destroy();
          if (cancelled) return;
          const name = cause instanceof Error ? cause.name : "";
          const passwordError = name === "PasswordException";
          if (passwordError) {
            onPasswordResult(true, false);
            setError(password ? labels.incorrectPassword : labels.enterPassword);
          } else {
            setError(labels.unsupported);
          }
          setStatus("error");
        }
      }

      void load();
      return function cleanUpPreview() {
        cancelled = true;
        void loadingTask?.destroy();
      };
    },
    [
      file,
      labels.enterPassword,
      labels.incorrectPassword,
      labels.unsupported,
      onPasswordResult,
      password,
    ],
  );

  return (
    <section aria-label={labels.preview} className="flex flex-col">
      <Text
        as="h2"
        className="text-ios-subheadline text-ios-secondary-label flex items-center justify-between gap-3 px-5 pt-4 pb-1.5 font-semibold"
      >
        {labels.preview}
        {pageSizes.length > 0 ? (
          <span className="font-normal tabular-nums">
            {pageSizes.length} {labels.pages}
          </span>
        ) : null}
      </Text>
      <div className="bg-ios-grouped-cell relative flex min-h-96 flex-col rounded-[22px] p-4 sm:p-6">
        {status === "ready" && document ? (
          <div className="flex w-full flex-col items-center gap-5">
            {pageSizes.map(function renderPage(size) {
              return (
                <PdfPreviewPage
                  key={size.pageNumber}
                  document={document}
                  height={size.height}
                  pageNumber={size.pageNumber}
                  width={size.width}
                />
              );
            })}
          </div>
        ) : null}
        {status === "loading" ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            aria-live="polite"
          >
            <span
              aria-hidden="true"
              className="border-ios-fill border-t-ios-secondary-label size-8 animate-spin rounded-full border-[3px] motion-reduce:animate-pulse"
            />
            <Text className="text-ios-subheadline text-ios-secondary-label">
              {labels.loadingPreview}
            </Text>
          </div>
        ) : null}
        {status === "error" ? (
          <Text
            role="alert"
            className="text-ios-subheadline text-ios-red m-auto max-w-xs text-center"
          >
            {error}
          </Text>
        ) : null}
      </div>
    </section>
  );
}
