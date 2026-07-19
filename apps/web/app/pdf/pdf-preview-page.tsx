"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";

import { useEffect, useRef, useState } from "react";

interface PdfPreviewPageProps {
  document: PDFDocumentProxy;
  height: number;
  pageNumber: number;
  width: number;
}

export function PdfPreviewPage({ document, height, pageNumber, width }: PdfPreviewPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready">("idle");

  useEffect(function watchVisibility() {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      function handleIntersection(entries) {
        if (
          !entries.some(function isVisible(entry) {
            return entry.isIntersecting;
          })
        )
          return;
        setShouldRender(true);
        observer.disconnect();
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(container);
    return function stopWatching() {
      observer.disconnect();
    };
  }, []);

  useEffect(
    function renderPage() {
      if (!shouldRender) return;
      let cancelled = false;
      let cancelRender: (() => void) | undefined;

      async function render() {
        setStatus("loading");
        const page = await document.getPage(pageNumber);
        try {
          const container = containerRef.current;
          const canvas = canvasRef.current;
          const context = canvas?.getContext("2d", { alpha: false });
          if (!container || !canvas || !context || cancelled) return;

          const displayWidth = Math.min(width, container.clientWidth);
          const viewport = page.getViewport({ scale: displayWidth / width });
          const outputScale = Math.min(window.devicePixelRatio || 1, 2);
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          const renderTask = page.render({
            canvas,
            canvasContext: context,
            transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
            viewport,
          });
          cancelRender = function cancelPageRender() {
            renderTask.cancel();
          };
          await renderTask.promise;
          if (!cancelled) setStatus("ready");
        } catch {
          if (!cancelled) setStatus("idle");
        } finally {
          page.cleanup();
        }
      }

      void render();
      return function cleanUpRender() {
        cancelled = true;
        cancelRender?.();
      };
    },
    [document, pageNumber, shouldRender, width],
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full shrink-0 overflow-hidden bg-white shadow-lg [content-visibility:auto]"
      style={{ aspectRatio: `${width} / ${height}`, maxWidth: width }}
    >
      <canvas
        ref={canvasRef}
        className={status === "ready" ? "size-full" : "invisible size-full"}
      />
      {status !== "ready" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <div className="size-7 animate-spin rounded-full border-4 border-primary/15 border-t-primary motion-reduce:animate-pulse" />
        </div>
      ) : null}
      <span className="absolute right-2 bottom-2 rounded-md border border-border bg-popover/90 px-2 py-1 text-xs text-popover-foreground tabular-nums shadow-xs backdrop-blur-sm">
        {pageNumber}
      </span>
    </div>
  );
}
