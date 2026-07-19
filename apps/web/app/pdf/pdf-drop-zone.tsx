"use client";

import type { DragEvent } from "react";

import { Button } from "@workspace/ui/components/button";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { useRef, useState } from "react";

import type { PdfToolLabels } from "./types";

interface PdfDropZoneProps {
  labels: PdfToolLabels;
  onFile: (file: File) => void;
}

function handleDragOver(event: DragEvent<HTMLDivElement>) {
  event.preventDefault();
}

export function PdfDropZone({ labels, onFile }: PdfDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function selectFirstPdf(files: FileList | null) {
    const file = Array.from(files ?? []).find(function findPdf(candidate) {
      return candidate.type === "application/pdf" || /\.pdf$/i.test(candidate.name);
    });
    if (file) onFile(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    selectFirstPdf(event.dataTransfer.files);
  }

  return (
    <div
      onDragEnter={function handleDragEnter(event) {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={function handleDragLeave(event) {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "flex min-h-72 flex-col items-center justify-center gap-5 rounded-xl border-2 border-dashed border-border bg-surface-inset px-6 py-12 text-center transition-[border-color,background-color,transform] duration-150 motion-reduce:transform-none motion-reduce:transition-none",
        isDragging && "scale-[1.01] border-primary bg-accent/60",
      )}
    >
      <div
        className="flex size-14 items-center justify-center rounded-2xl border border-border bg-card text-2xl text-primary shadow-sm"
        aria-hidden="true"
      >
        PDF
      </div>
      <div className="flex flex-col gap-1.5">
        <Text size="lg" weight="semibold">
          {isDragging ? labels.dropActive : labels.dropPrompt}
        </Text>
        <Text size="sm" tone="muted">
          {labels.supported}
        </Text>
      </div>
      <Button
        type="button"
        onClick={function openPicker() {
          inputRef.current?.click();
        }}
      >
        {labels.chooseFile}
      </Button>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept=".pdf,application/pdf"
        onChange={function selectFile(event) {
          selectFirstPdf(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
