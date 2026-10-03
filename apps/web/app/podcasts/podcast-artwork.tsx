import { cn } from "@workspace/ui/lib/utils";
import Image from "next/image";

interface PodcastArtworkProps {
  alt?: string;
  className?: string;
  priority?: boolean;
  sizes: string;
  src: string;
}

/** Square show artwork with the hairline border and continuous corners used across Podcasts. */
export function PodcastArtwork({
  alt = "",
  className,
  priority = false,
  sizes,
  src,
}: PodcastArtworkProps) {
  return (
    <span
      className={cn(
        "relative block aspect-square shrink-0 overflow-hidden rounded-lg bg-(--ios-tertiary-fill) after:absolute after:inset-0 after:rounded-[inherit] after:border-[0.5px] after:border-black/10 dark:after:border-white/10",
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        quality={75}
        priority={priority}
        className="object-cover"
      />
    </span>
  );
}
