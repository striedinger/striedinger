"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";

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
      let destroyDocument: (() => Promise<void>) | undefined;

      async function load() {
        setStatus("loading");
        setError("");
        try {
          const pdfjs = await import("pdfjs-dist");
          pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url,
          ).toString();
          const loadingTask = pdfjs.getDocument({
            data: new Uint8Array(await file.arrayBuffer()),
            password: password || undefined,
          });
          const loadedDocument = await loadingTask.promise;
          destroyDocument = function destroyLoadedDocument() {
            return loadingTask.destroy();
          };

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
        void destroyDocument?.();
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
    <div className="flex min-h-[32rem] flex-col overflow-hidden rounded-xl border border-border bg-surface-inset lg:h-[min(75vh,56rem)]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <Text size="sm" weight="semibold">
          {labels.preview}
        </Text>
        {pageSizes.length > 0 ? (
          <Text size="sm" tone="muted">
            {pageSizes.length} {labels.pages}
          </Text>
        ) : null}
      </div>
      <div className="relative flex min-h-0 flex-1 overflow-auto bg-black/5 p-4 sm:p-6 dark:bg-white/5">
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
            <div className="size-9 animate-spin rounded-full border-4 border-primary/20 border-t-primary motion-reduce:animate-pulse" />
            <Text size="sm" tone="muted">
              {labels.loadingPreview}
            </Text>
          </div>
        ) : null}
        {status === "error" ? (
          <Text className="m-auto text-center text-destructive">{error}</Text>
        ) : null}
      </div>
    </div>
  );
}
