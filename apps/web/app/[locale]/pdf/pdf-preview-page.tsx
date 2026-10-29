"use client";

import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

import { Text } from "@workspace/ui/components/text";
import { useEffect, useRef, useState } from "react";

interface PdfPreviewPageProps {
  document: PDFDocumentProxy;
  /** The size to reserve until this page reports its own, usually the first page's. */
  estimatedSize: { height: number; width: number };
  pageNumber: number;
}

/**
 * One page, drawn only while it is near the viewport. Pages that scroll far away give their
 * canvas memory back, which iOS Safari caps, and draw again when they return.
 */
export function PdfPreviewPage({ document, estimatedSize, pageNumber }: PdfPreviewPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const [size, setSize] = useState(estimatedSize);
  const [status, setStatus] = useState<"idle" | "loading" | "ready">("idle");

  useEffect(function watchVisibility() {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      function handleIntersection(entries) {
        const entry = entries.at(-1);
        if (entry) setIsNearViewport(entry.isIntersecting);
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
      const canvas = canvasRef.current;
      if (!isNearViewport) {
        // Shrinking the canvas releases its backing store; the reserved size keeps the layout.
        if (canvas) {
          canvas.width = 0;
          canvas.height = 0;
        }
        return;
      }
      let cancelled = false;
      let cancelRender: (() => void) | undefined;

      // The cleanup sets `cancelled` during the awaits below; reading it through a call keeps
      // TypeScript from narrowing the later checks away.
      function isCancelled() {
        return cancelled;
      }

      async function render() {
        setStatus("loading");
        let page: PDFPageProxy | undefined;
        try {
          page = await document.getPage(pageNumber);
          const container = containerRef.current;
          const context = canvas?.getContext("2d", { alpha: false });
          if (!container || !canvas || !context || isCancelled()) return;

          const naturalViewport = page.getViewport({ scale: 1 });
          setSize({ height: naturalViewport.height, width: naturalViewport.width });
          const displayWidth = Math.min(naturalViewport.width, container.clientWidth);
          const viewport = page.getViewport({ scale: displayWidth / naturalViewport.width });
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
          if (!isCancelled()) setStatus("ready");
        } catch {
          if (!isCancelled()) setStatus("idle");
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
    [document, isNearViewport, pageNumber],
  );

  // A page that scrolled away has given up its pixels, whatever it last finished drawing.
  const isShowing = status === "ready" && isNearViewport;

  return (
    <div
      ref={containerRef}
      className="relative w-full shrink-0 overflow-hidden rounded-ios-xs bg-white shadow-ios-raised [content-visibility:auto]"
      style={{ aspectRatio: `${size.width} / ${size.height}`, maxWidth: size.width }}
    >
      <canvas ref={canvasRef} className={isShowing ? "size-full" : "invisible size-full"} />
      {isShowing ? null : (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <span className="size-7 animate-spin rounded-full border-[3px] border-black/10 border-t-black/45 motion-reduce:animate-pulse" />
        </div>
      )}
      <Text
        as="span"
        className="absolute right-2 bottom-2 rounded-full bg-black/55 px-2.5 py-0.5 text-ios-caption1 font-medium text-white tabular-nums backdrop-blur-md"
      >
        {pageNumber}
      </Text>
    </div>
  );
}
