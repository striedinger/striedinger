"use client";

import { PlusIcon } from "@workspace/icons/plus-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useEffectEvent, useState } from "react";

interface PdfDropZoneProps {
  label: string;
  onFiles: (files: File[]) => void;
}

/**
 * Lets a PDF be dropped anywhere on the screen, like dragging files onto an iPad app, and
 * outlines the whole screen while files are dragged over it.
 */
export function PdfDropZone({ label, onFiles }: PdfDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const receiveFiles = useEffectEvent(onFiles);

  useEffect(function acceptFilesDroppedOnScreen() {
    let dragDepth = 0;

    function handleDragEnter(event: DragEvent) {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      dragDepth += 1;
      setIsDragging(true);
    }

    function handleDragOver(event: DragEvent) {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    }

    function handleDragLeave(event: DragEvent) {
      if (!carriesFiles(event)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) setIsDragging(false);
    }

    function handleDrop(event: DragEvent) {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      dragDepth = 0;
      setIsDragging(false);
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length > 0) receiveFiles(files);
    }

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    return function stopAcceptingFiles() {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  return (
    <div
      aria-hidden={!isDragging}
      className={cn(
        "pointer-events-none absolute inset-3 z-30 flex flex-col items-center justify-center gap-3 rounded-[38px] border-2 border-dashed border-(--ios-tint) bg-(--ios-tint)/10 backdrop-blur-[6px] transition-opacity duration-200 motion-reduce:transition-none",
        isDragging ? "opacity-100" : "opacity-0",
      )}
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-(--ios-tint) text-white [&_svg]:size-8">
        <PlusIcon strokeWidth={2.6} />
      </span>
      <Text className="text-[20px] leading-[25px] font-semibold text-(--ios-label)">{label}</Text>
    </div>
  );
}

function carriesFiles(event: DragEvent) {
  return event.dataTransfer?.types.includes("Files") ?? false;
}
