const placeholders = [0, 1, 2, 3];

interface EpisodeListSkeletonProps {
  label: string;
}

/** Stand-in rows shown while a show's episodes stream in. */
export function EpisodeListSkeleton({ label }: EpisodeListSkeletonProps) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-6 px-4 pt-4">
      {placeholders.map(function renderPlaceholder(placeholder) {
        return (
          <div
            key={placeholder}
            className="flex animate-pulse flex-col gap-2 motion-reduce:animate-none"
          >
            <span className="h-3 w-16 rounded bg-ios-tertiary-fill" />
            <span className="h-4 w-4/5 rounded bg-ios-tertiary-fill" />
            <span className="h-3 w-full rounded bg-ios-tertiary-fill" />
            <span className="h-7 w-24 rounded-full bg-ios-tertiary-fill" />
          </div>
        );
      })}
    </div>
  );
}
