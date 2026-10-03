"use client";

import { useSyncExternalStore } from "react";

const artworkColors = new Map<string, string | null>();
const artworkListeners = new Map<string, Set<() => void>>();
const sampleSize = 12;

/**
 * Samples a tiny same-origin rendition of the artwork from the Next.js image optimizer and
 * returns a deep, saturated tone suitable for white text, like the tinted Podcasts screens.
 */
function loadArtworkColor(artworkUrl: string) {
  if (artworkColors.has(artworkUrl)) return;
  artworkColors.set(artworkUrl, null);
  const image = new Image();
  image.decoding = "async";
  image.addEventListener("load", function sampleArtwork() {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0, sampleSize, sampleSize);
      const { data } = context.getImageData(0, 0, sampleSize, sampleSize);
      let red = 0;
      let green = 0;
      let blue = 0;
      let totalWeight = 0;
      for (let index = 0; index < data.length; index += 4) {
        const pixelRed = data[index] ?? 0;
        const pixelGreen = data[index + 1] ?? 0;
        const pixelBlue = data[index + 2] ?? 0;
        const saturation =
          Math.max(pixelRed, pixelGreen, pixelBlue) - Math.min(pixelRed, pixelGreen, pixelBlue);
        const weight = 1 + saturation / 32;
        red += pixelRed * weight;
        green += pixelGreen * weight;
        blue += pixelBlue * weight;
        totalWeight += weight;
      }
      artworkColors.set(
        artworkUrl,
        toBackgroundTone(red / totalWeight, green / totalWeight, blue / totalWeight),
      );
    } catch {
      artworkColors.set(artworkUrl, null);
    }
    for (const listener of artworkListeners.get(artworkUrl) ?? []) listener();
  });
  image.src = `/_next/image?url=${encodeURIComponent(artworkUrl)}&w=32&q=60`;
}

function toBackgroundTone(red: number, green: number, blue: number) {
  const max = Math.max(red, green, blue) / 255;
  const min = Math.min(red, green, blue) / 255;
  const lightness = (max + min) / 2;
  const delta = max - min;
  let hue = 0;
  if (delta > 0) {
    if (max === red / 255) hue = ((green - blue) / 255 / delta) % 6;
    else if (max === green / 255) hue = (blue - red) / 255 / delta + 2;
    else hue = (red - green) / 255 / delta + 4;
  }
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  const hueDegrees = Math.round((hue * 60 + 360) % 360);
  const toneSaturation = Math.round(Math.min(0.75, saturation * 1.1) * 100);
  const toneLightness = Math.round(Math.min(0.34, Math.max(0.2, lightness * 0.6)) * 100);
  return `hsl(${hueDegrees} ${toneSaturation}% ${toneLightness}%)`;
}

const subscribersByUrl = new Map<string, (listener: () => void) => () => void>();

function ignoreSubscription() {
  return function ignoreUnsubscribe() {};
}

function getArtworkSubscriber(artworkUrl: string) {
  let subscribe = subscribersByUrl.get(artworkUrl);
  if (!subscribe) {
    subscribe = function subscribeToArtworkColor(listener: () => void) {
      const listeners = artworkListeners.get(artworkUrl) ?? new Set();
      listeners.add(listener);
      artworkListeners.set(artworkUrl, listeners);
      loadArtworkColor(artworkUrl);
      return function unsubscribeFromArtworkColor() {
        listeners.delete(listener);
      };
    };
    subscribersByUrl.set(artworkUrl, subscribe);
  }
  return subscribe;
}

function getServerArtworkColor() {
  return null;
}

export function useArtworkColor(artworkUrl: string | null) {
  return useSyncExternalStore(
    artworkUrl ? getArtworkSubscriber(artworkUrl) : ignoreSubscription,
    function getArtworkColor() {
      return artworkUrl ? (artworkColors.get(artworkUrl) ?? null) : null;
    },
    getServerArtworkColor,
  );
}
