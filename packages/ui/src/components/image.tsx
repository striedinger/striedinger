"use client";

import type { ComponentPropsWithRef, SyntheticEvent } from "react";

import { BrokenCameraIcon } from "@workspace/icons/broken-camera-icon";
import { cn } from "@workspace/ui/lib/utils";
import { useState } from "react";

type ImageProps = Omit<ComponentPropsWithRef<"img">, "alt" | "className"> & {
  alt: string;
  className?: string;
  imageClassName?: string;
};

function Image({ alt, className, imageClassName, onError, onLoad, src, ...props }: ImageProps) {
  const [failedSource, setFailedSource] = useState<string>();
  const [loadedSource, setLoadedSource] = useState<string>();
  const source = typeof src === "string" ? src : undefined;
  const status = failedSource === source ? "error" : loadedSource === source ? "loaded" : "loading";

  function handleError(event: SyntheticEvent<HTMLImageElement>) {
    setFailedSource(source);
    onError?.(event);
  }

  function handleLoad(event: SyntheticEvent<HTMLImageElement>) {
    setLoadedSource(source);
    onLoad?.(event);
  }

  return (
    <span
      data-slot="image"
      data-state={status}
      aria-busy={status === "loading"}
      className={cn("relative block overflow-hidden bg-muted", className)}
    >
      <img
        alt={status === "error" ? "" : alt}
        src={src}
        onError={handleError}
        onLoad={handleLoad}
        className={cn(
          "size-full object-cover transition-opacity duration-200",
          status === "loaded" ? "opacity-100" : "opacity-0",
          imageClassName,
        )}
        {...props}
      />
      {status === "loading" ? (
        <span
          data-slot="image-loading"
          aria-hidden="true"
          className="absolute inset-0 animate-shimmer bg-[linear-gradient(100deg,transparent_20%,color-mix(in_oklab,var(--color-foreground)_8%,transparent)_50%,transparent_80%)] bg-[length:200%_100%] motion-reduce:animate-none"
        />
      ) : null}
      {status === "error" ? (
        <span
          data-slot="image-error"
          role={alt ? "img" : undefined}
          aria-label={alt || undefined}
          aria-hidden={alt ? undefined : true}
          className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground"
        >
          <BrokenCameraIcon className="size-8" />
        </span>
      ) : null}
    </span>
  );
}

export { Image };
export type { ImageProps };
