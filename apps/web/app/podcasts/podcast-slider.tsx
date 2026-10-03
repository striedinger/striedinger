"use client";

import type { KeyboardEvent, PointerEvent } from "react";

import { cn } from "@workspace/ui/lib/utils";
import { useRef, useState } from "react";

interface PodcastSliderProps {
  className?: string;
  keyboardStep: number;
  label: string;
  max: number;
  onChange?: (value: number) => void;
  onCommit: (value: number) => void;
  onDragChange?: (value: number | null) => void;
  value: number;
  valueText: string;
}

/**
 * The thin Now Playing track that thickens while it is dragged. Pointer movement updates
 * only local state; the committed value is reported on release, so seeking does not fight
 * the playhead while the user scrubs.
 */
export function PodcastSlider({
  className,
  keyboardStep,
  label,
  max,
  onChange,
  onCommit,
  onDragChange,
  value,
  valueText,
}: PodcastSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const displayedValue = dragValue ?? value;
  const ratio = max > 0 ? Math.min(1, Math.max(0, displayedValue / max)) : 0;

  function readPointerValue(event: PointerEvent<HTMLDivElement>) {
    const bounds = trackRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0) return displayedValue;
    return (Math.min(bounds.width, Math.max(0, event.clientX - bounds.left)) / bounds.width) * max;
  }

  function updateDrag(nextValue: number | null) {
    setDragValue(nextValue);
    onDragChange?.(nextValue);
    if (nextValue !== null) onChange?.(nextValue);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const deltas: Record<string, number> = {
      ArrowLeft: -keyboardStep,
      ArrowDown: -keyboardStep,
      ArrowRight: keyboardStep,
      ArrowUp: keyboardStep,
      PageDown: -keyboardStep * 4,
      PageUp: keyboardStep * 4,
    };
    let nextValue: number | null = null;
    if (event.key in deltas) nextValue = value + (deltas[event.key] ?? 0);
    if (event.key === "Home") nextValue = 0;
    if (event.key === "End") nextValue = max;
    if (nextValue === null) return;
    event.preventDefault();
    const clampedValue = Math.min(max, Math.max(0, nextValue));
    onChange?.(clampedValue);
    onCommit(clampedValue);
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(displayedValue)}
      aria-valuetext={valueText}
      data-base-ui-swipe-ignore=""
      data-dragging={dragValue !== null || undefined}
      className={cn(
        "group/slider relative flex h-7 cursor-pointer touch-none items-center outline-none select-none",
        className,
      )}
      onKeyDown={handleKeyDown}
      onPointerDown={function startDrag(event) {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        updateDrag(readPointerValue(event));
      }}
      onPointerMove={function continueDrag(event) {
        if (dragValue === null) return;
        updateDrag(readPointerValue(event));
      }}
      onPointerUp={function finishDrag(event) {
        if (dragValue === null) return;
        const committedValue = readPointerValue(event);
        updateDrag(null);
        onCommit(committedValue);
      }}
      onPointerCancel={function cancelDrag() {
        updateDrag(null);
      }}
    >
      <div
        ref={trackRef}
        className="relative h-[5px] w-full overflow-hidden rounded-full bg-white/25 transition-[height] duration-200 group-focus-visible/slider:ring-2 group-focus-visible/slider:ring-white/60 group-data-dragging/slider:h-[9px] motion-reduce:transition-none"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white/80 group-data-dragging/slider:bg-white"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
