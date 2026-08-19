"use client";

import { Text } from "@workspace/ui/components/text";
import { useEffect } from "react";

import { saveVisitClientData } from "./actions";

interface RedirectTrackerProps {
  targetUrl: string;
  visitId: string;
}

const trackingTimeoutMilliseconds = 400;

export function RedirectTracker({ targetUrl, visitId }: RedirectTrackerProps) {
  useEffect(() => {
    let cancelled = false;

    async function trackAndRedirect() {
      try {
        // Bound the delay logging can add to the redirect; writes still
        // in flight when the timeout wins may be lost to navigation.
        await Promise.race([
          saveVisitClientData(visitId, collectClientData()).catch(function ignoreError() {}),
          new Promise(function timeout(resolve) {
            setTimeout(resolve, trackingTimeoutMilliseconds);
          }),
        ]);
      } catch {
        // Logging must never block the redirect.
      }

      if (!cancelled) {
        window.location.replace(targetUrl);
      }
    }

    void trackAndRedirect();

    return () => {
      cancelled = true;
    };
  }, [targetUrl, visitId]);

  return (
    <main className="flex min-h-svh items-center justify-center">
      <Text size="sm" tone="muted">
        Redirecting… <a href={targetUrl}>Continue</a>
      </Text>
    </main>
  );
}

function collectClientData(): Record<string, string> {
  const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };

  return {
    canvas: getCanvasSignature(),
    colorDepth: String(screen.colorDepth),
    deviceMemory: String(navigatorWithMemory.deviceMemory ?? ""),
    hardwareConcurrency: String(navigator.hardwareConcurrency ?? ""),
    languages: (navigator.languages ?? [navigator.language]).join(","),
    maxTouchPoints: String(navigator.maxTouchPoints ?? 0),
    platform: navigator.platform,
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
  };
}

function getCanvasSignature(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const context = canvas.getContext("2d");

    if (!context) {
      return "";
    }

    context.textBaseline = "top";
    context.font = "16px Arial";
    context.fillStyle = "#f60";
    context.fillRect(10, 10, 80, 20);
    context.fillStyle = "#069";
    context.fillText("card-visit fp", 14, 16);

    return hashText(canvas.toDataURL());
  } catch {
    return "";
  }
}

function hashText(text: string): string {
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (Math.imul(hash, 31) + text.charCodeAt(index)) | 0;
  }

  return (hash >>> 0).toString(16);
}
