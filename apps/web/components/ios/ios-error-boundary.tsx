"use client";

import type { ErrorInfo, ReactNode } from "react";

import { Component } from "react";

interface IosErrorBoundaryProps {
  children: ReactNode;
  /** What renders in place of the failed content; nothing by default. */
  fallback?: ReactNode;
  onError?: (error: unknown) => void;
  /** Changing this value renders the children again after a failure. */
  resetKey?: unknown;
}

interface IosErrorBoundaryState {
  hasError: boolean;
  resetKey: unknown;
}

/**
 * Contains a failure in an optional surface, such as a sheet whose code fails to load on a
 * flaky connection, so the rest of the app keeps working. Error boundaries must be classes.
 */
export class IosErrorBoundary extends Component<IosErrorBoundaryProps, IosErrorBoundaryState> {
  override state: IosErrorBoundaryState = { hasError: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError(): Partial<IosErrorBoundaryState> {
    return { hasError: true };
  }

  static getDerivedStateFromProps(
    props: IosErrorBoundaryProps,
    state: IosErrorBoundaryState,
  ): Partial<IosErrorBoundaryState> | null {
    return props.resetKey === state.resetKey ? null : { hasError: false, resetKey: props.resetKey };
  }

  override componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error(error, errorInfo.componentStack);
    this.props.onError?.(error);
  }

  override render() {
    return this.state.hasError ? (this.props.fallback ?? null) : this.props.children;
  }
}
