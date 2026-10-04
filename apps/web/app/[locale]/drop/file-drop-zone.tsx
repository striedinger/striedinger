"use client";

import { PlusIcon } from "@workspace/icons/plus-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";

import type { DropLabels } from "./types";

import { iosFilledButtonClassName } from "../../../components/ios/ios-button-styles";
import { iosBottomScrollEdgeClassName } from "../../../components/ios/ios-scroll-edge";

interface FileDropZoneProps {
  children: ReactNode;
  labels: DropLabels;
  onFiles: (files: File[]) => void;
}

/**
 * The whole screen accepts dropped files, and a floating glass toolbar picks them, like the
 * share sheets and file pickers of iOS 26.
 */
export function FileDropZone({ children, labels, onFiles }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current === 0) setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) onFiles(files);
  }

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    if (files.length > 0) onFiles(files);
    event.currentTarget.value = "";
  }

  return (
    <div
      className="relative flex size-full flex-col bg-ios-grouped-background"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      <div
        aria-hidden={!isDragging}
        className={cn(
          "pointer-events-none absolute inset-3 z-30 flex flex-col items-center justify-center gap-3 rounded-ios-sheet border-2 border-dashed border-ios-tint bg-ios-tint/10 backdrop-blur-[6px] transition-opacity duration-200 motion-reduce:transition-none",
          isDragging ? "opacity-100" : "opacity-0",
        )}
      >
        <span className="flex size-16 items-center justify-center rounded-full bg-ios-tint text-white [&_svg]:size-8">
          <PlusIcon strokeWidth={2.6} />
        </span>
        <Text className="text-ios-title3 font-semibold text-ios-label">{labels.dropFiles}</Text>
      </div>
      <div
        role="toolbar"
        aria-label={labels.addFiles}
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pt-8 pb-[max(env(safe-area-inset-bottom),14px)]",
          iosBottomScrollEdgeClassName,
        )}
      >
        <label
          htmlFor="drop-file-input"
          className={cn(
            iosFilledButtonClassName,
            "pointer-events-auto w-full max-w-sm cursor-pointer",
          )}
        >
          <PlusIcon strokeWidth={2.8} />
          {labels.selectFiles}
          <input
            id="drop-file-input"
            type="file"
            className="sr-only"
            multiple
            aria-describedby="drop-file-limits"
            onChange={handleFileSelection}
          />
        </label>
        <span id="drop-file-limits" className="sr-only">
          {labels.privacy}
        </span>
      </div>
    </div>
  );
}

function handleDragOver(event: DragEvent<HTMLDivElement>) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
}
