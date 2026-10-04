"use client";

import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

import { Text } from "@workspace/ui/components/text";
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
        let page: PDFPageProxy | undefined;
        try {
          page = await document.getPage(pageNumber);
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
          page?.cleanup();
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
      className="relative w-full shrink-0 overflow-hidden rounded-ios-xs bg-white shadow-ios-raised [content-visibility:auto]"
      style={{ aspectRatio: `${width} / ${height}`, maxWidth: width }}
    >
      <canvas
        ref={canvasRef}
        className={status === "ready" ? "size-full" : "invisible size-full"}
      />
      {status !== "ready" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <span className="size-7 animate-spin rounded-full border-[3px] border-black/10 border-t-black/45 motion-reduce:animate-pulse" />
        </div>
      ) : null}
      <Text
        as="span"
        className="absolute right-2 bottom-2 rounded-full bg-black/55 px-2.5 py-0.5 text-ios-caption1 font-medium text-white tabular-nums backdrop-blur-md"
      >
        {pageNumber}
      </Text>
    </div>
  );
}
