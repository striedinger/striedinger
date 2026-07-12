import type { ComponentPropsWithRef, ElementType } from "react"

import { cn } from "@workspace/ui/lib/utils"

type TextSize =
  | "xs"
  | "sm"
  | "base"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "6xl"
type TextWeight = "normal" | "medium" | "semibold" | "bold"
type TextFamily = "sans" | "serif" | "mono"
type TextTone = "default" | "muted" | "destructive"
type TextAlign = "start" | "center" | "end" | "justify"

const sizeClasses: Readonly<Record<TextSize, string>> = {
  xs: "text-xs leading-4",
  sm: "text-sm leading-5",
  base: "text-base leading-6",
  lg: "text-lg leading-7",
  xl: "text-xl leading-7",
  "2xl": "text-2xl leading-8",
  "3xl": "text-3xl leading-9",
  "4xl": "text-4xl leading-10",
  "5xl": "text-5xl leading-none",
  "6xl": "text-6xl leading-none",
}

const weightClasses: Readonly<Record<TextWeight, string>> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
}

const familyClasses: Readonly<Record<TextFamily, string>> = {
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
}

const toneClasses: Readonly<Record<TextTone, string>> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  destructive: "text-destructive",
}

const alignClasses: Readonly<Record<TextAlign, string>> = {
  start: "text-start",
  center: "text-center",
  end: "text-end",
  justify: "text-justify",
}

type TextOwnProps<Element extends ElementType> = {
  align?: TextAlign
  as?: Element
  family?: TextFamily
  size?: TextSize
  tone?: TextTone
  weight?: TextWeight
}

type TextProps<Element extends ElementType = "p"> = TextOwnProps<Element> &
  Omit<ComponentPropsWithRef<Element>, keyof TextOwnProps<Element>>

function Text<Element extends ElementType = "p">({
  align,
  as,
  className,
  family,
  size = "base",
  tone = "default",
  weight = "normal",
  ...props
}: TextProps<Element>) {
  const Component = as ?? "p"

  return (
    <Component
      data-slot="text"
      className={cn(
        sizeClasses[size],
        weightClasses[weight],
        family ? familyClasses[family] : undefined,
        toneClasses[tone],
        align ? alignClasses[align] : undefined,
        className
      )}
      {...props}
    />
  )
}

export { Text }
export type { TextAlign, TextFamily, TextProps, TextSize, TextTone, TextWeight }
