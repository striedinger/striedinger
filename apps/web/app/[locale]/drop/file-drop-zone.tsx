"use client";

import { PlusIcon } from "@workspace/icons/plus-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";

import type { DropLabels } from "./types";

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
      className="relative flex size-full flex-col bg-(--ios-grouped-background)"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
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
        <Text className="text-[20px] leading-[25px] font-semibold text-(--ios-label)">
          {labels.dropFiles}
        </Text>
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
          className="pointer-events-auto flex h-[52px] w-full max-w-sm cursor-pointer items-center justify-center gap-2 rounded-full bg-(--ios-tint) text-[17px] font-semibold tracking-[-0.43px] text-white shadow-[inset_0_0.5px_0_0.5px_rgb(255_255_255/0.35),0_8px_24px_rgb(0_0_0/0.18)] transition-transform duration-150 select-none focus-within:ring-2 focus-within:ring-(--ios-tint)/50 active:scale-[0.97] motion-reduce:transition-none [&_svg]:size-5"
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
