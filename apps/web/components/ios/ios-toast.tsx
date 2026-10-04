import { cn } from "@workspace/ui/lib/utils";

import { iosStrongGlassClassName } from "./ios-glass";

interface IosToastProps {
  message: string;
}

/** A brief glass capsule confirmation, announced politely to assistive technology. */
export function IosToast({ message }: IosToastProps) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "pointer-events-none absolute top-[calc(env(safe-area-inset-top)+16px)] left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-ios-subheadline font-semibold text-ios-label transition-[opacity,translate,scale] duration-300 ease-[cubic-bezier(0.34,1.3,0.64,1)] motion-reduce:transition-none",
        iosStrongGlassClassName,
        message ? "translate-y-0 scale-100 opacity-100" : "-translate-y-3 scale-90 opacity-0",
      )}
    >
      {message}
    </div>
  );
}
