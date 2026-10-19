"use client";

import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";

import { Text } from "@workspace/ui/components/text";
import { useEffect, useState } from "react";

import type { PdfToolLabels } from "./types";

import { openPdfDocument } from "./open-pdf-document";
import { PdfPreviewPage } from "./pdf-preview-page";

interface PdfPreviewProps {
  file: File;
  labels: PdfToolLabels;
  onPasswordResult: (requiresPassword: boolean, isValid: boolean) => void;
  password: string;
}

interface OpenedPreview {
  document: PDFDocumentProxy;
  /** The first page's size, which later pages show until they render with their own. */
  pageSize: { height: number; width: number };
}

/** Pages mount in batches as the reader nears the end, so long documents stay light. */
const pageBatchSize = 24;

export function PdfPreview({ file, labels, onPasswordResult, password }: PdfPreviewProps) {
  const [preview, setPreview] = useState<OpenedPreview>();
  const [mountedPageCount, setMountedPageCount] = useState(pageBatchSize);
  const [status, setStatus] = useState<"error" | "loading" | "ready">("loading");
  const [error, setError] = useState("");

  useEffect(
    function loadPreview() {
      let cancelled = false;
      let loadingTask: PDFDocumentLoadingTask | undefined;

      async function load() {
        setStatus("loading");
        setError("");
        setPreview(undefined);
        setMountedPageCount(pageBatchSize);
        try {
          // pdf.js starts downloading while the file is read.
          const [buffer] = await Promise.all([
            file.arrayBuffer(),
            import("pdfjs-dist/legacy/build/pdf.mjs"),
          ]);
          if (cancelled) return;
          const task = await openPdfDocument({
            data: new Uint8Array(buffer),
            password: password || undefined,
          });
          loadingTask = task;
          if (cancelled) {
            void task.destroy();
            return;
          }
          const loadedDocument = await task.promise;
          if (cancelled) return;

          // Only the first page is measured up front; the rest size themselves as they render.
          const firstPage = await loadedDocument.getPage(1);
          const viewport = firstPage.getViewport({ scale: 1 });
          firstPage.cleanup();
          if (cancelled) return;

          onPasswordResult(Boolean(password), true);
          setPreview({
            document: loadedDocument,
            pageSize: { height: viewport.height, width: viewport.width },
          });
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

  const pageCount = preview?.document.numPages ?? 0;
  const visiblePageCount = Math.min(pageCount, mountedPageCount);

  return (
    <section aria-label={labels.preview} className="flex flex-col">
      <Text
        as="h2"
        className="flex items-center justify-between gap-3 px-5 pt-4 pb-1.5 text-ios-subheadline font-semibold text-ios-secondary-label"
      >
        {labels.preview}
        {pageCount > 0 ? (
          <span className="font-normal tabular-nums">
            {pageCount} {labels.pages}
          </span>
        ) : null}
      </Text>
      <div className="relative flex min-h-96 flex-col rounded-ios-xl bg-ios-grouped-cell p-4 sm:p-6">
        {status === "ready" && preview ? (
          <div className="flex w-full flex-col items-center gap-5">
            {Array.from({ length: visiblePageCount }, function renderPage(_, index) {
              return (
                <PdfPreviewPage
                  key={index + 1}
                  document={preview.document}
                  estimatedSize={preview.pageSize}
                  pageNumber={index + 1}
                />
              );
            })}
            {visiblePageCount < pageCount ? (
              <div
                // A new sentinel per batch, so it reports again if it is still in range.
                key={visiblePageCount}
                aria-hidden="true"
                className="h-px w-full"
                ref={function watchForMorePages(sentinel: HTMLDivElement | null) {
                  if (!sentinel) return;
                  const observer = new IntersectionObserver(
                    function mountNextBatch(entries) {
                      if (entries.some(isIntersecting)) setMountedPageCount(addBatch);
                    },
                    { rootMargin: "1200px 0px" },
                  );
                  observer.observe(sentinel);
                  return function stopWatching() {
                    observer.disconnect();
                  };
                }}
              />
            ) : null}
          </div>
        ) : null}
        {status === "loading" ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            aria-live="polite"
          >
            <span
              aria-hidden="true"
              className="size-8 animate-spin rounded-full border-[3px] border-ios-fill border-t-ios-secondary-label motion-reduce:animate-pulse"
            />
            <Text className="text-ios-subheadline text-ios-secondary-label">
              {labels.loadingPreview}
            </Text>
          </div>
        ) : null}
        {status === "error" ? (
          <Text
            role="alert"
            className="m-auto max-w-xs text-center text-ios-subheadline text-ios-red"
          >
            {error}
          </Text>
        ) : null}
      </div>
    </section>
  );
}

function isIntersecting(entry: IntersectionObserverEntry) {
  return entry.isIntersecting;
}

function addBatch(count: number) {
  return count + pageBatchSize;
}
