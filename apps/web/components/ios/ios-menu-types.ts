import type { ReactNode } from "react";

export interface IosMenuAction {
  checked?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  id: string;
  label: string;
  onSelect: () => void;
}

export interface IosMenuSection {
  actions: readonly IosMenuAction[];
  id: string;
  title?: string;
}

export interface IosMenuVirtualAnchor {
  getBoundingClientRect: () => DOMRect;
}
