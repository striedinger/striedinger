"use client";

interface VideoWaveformProps {
  /** Peaks from 0 to 1 spread evenly over the video. */
  peaks: Float32Array;
}

/**
 * The audio's loudness drawn along the bottom of the filmstrip, so cuts can land in pauses. It
 * paints once, and again only when the strip changes width.
 */
export function VideoWaveform({ peaks }: VideoWaveformProps) {
  return (
    <canvas
      ref={function attachWaveform(canvas: HTMLCanvasElement | null) {
        if (!canvas) return;
        const observer = new ResizeObserver(function redraw() {
          drawWaveform(canvas, peaks);
        });
        observer.observe(canvas);
        return function detachWaveform() {
          observer.disconnect();
        };
      }}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 w-full bg-linear-to-t from-black/50 to-transparent"
    />
  );
}

function drawWaveform(canvas: HTMLCanvasElement, peaks: Float32Array) {
  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.round(canvas.clientWidth * pixelRatio);
  const height = Math.round(canvas.clientHeight * pixelRatio);
  if (width === 0 || height === 0) return;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "rgb(255 255 255 / 0.85)";
  // One bar every three device pixels, each showing the loudest peak it covers.
  const barWidth = Math.max(1, Math.round(2 * pixelRatio));
  const barStep = barWidth + Math.max(1, Math.round(pixelRatio));
  for (let x = 0; x < width; x += barStep) {
    const first = Math.floor((x / width) * peaks.length);
    const last = Math.max(first + 1, Math.floor(((x + barStep) / width) * peaks.length));
    let peak = 0;
    for (let index = first; index < last && index < peaks.length; index += 1) {
      peak = Math.max(peak, peaks[index] ?? 0);
    }
    const barHeight = Math.max(pixelRatio, peak * height * 0.9);
    context.fillRect(x, height - barHeight, barWidth, barHeight);
  }
}
