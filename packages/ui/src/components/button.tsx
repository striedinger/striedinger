"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cn } from "@workspace/ui/lib/utils";

type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type ButtonSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";

const variantClasses: Readonly<Record<ButtonVariant, string>> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive:
    "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20",
  outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizeClasses: Readonly<Record<ButtonSize, string>> = {
  default: "h-9 px-4 py-2 has-[svg]:px-3",
  xs: "h-6 gap-1 rounded-md px-2 text-xs has-[svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
  sm: "h-8 gap-1.5 rounded-md px-3 has-[svg]:px-2.5",
  lg: "h-10 rounded-md px-6 has-[svg]:px-4",
  icon: "size-9",
  "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
  "icon-sm": "size-8",
  "icon-lg": "size-10",
};

interface ButtonProps extends ButtonPrimitive.Props {
  loading?: boolean;
  loadingLabel?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

function Button({
  "aria-label": ariaLabel,
  className,
  children,
  disabled,
  loading = false,
  loadingLabel,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-loading={loading ? "true" : undefined}
      data-variant={variant}
      data-size={size}
      aria-busy={loading}
      aria-label={loading && loadingLabel ? loadingLabel : ariaLabel}
      disabled={disabled || loading}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      <span
        data-slot="button-content"
        className={cn(
          "inline-flex items-center justify-center gap-[inherit]",
          loading && "invisible",
        )}
      >
        {children}
      </span>
      {loading ? (
        <span
          data-slot="button-spinner"
          aria-hidden="true"
          className="absolute size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
        />
      ) : null}
    </ButtonPrimitive>
  );
}

export { Button };
export type { ButtonProps, ButtonSize, ButtonVariant };
