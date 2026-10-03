"use client";

import { lazy, Suspense } from "react";

import type { IosAlertProps } from "./ios-alert-dialog";

import { useHasOpened } from "./use-has-opened";

const IosAlertDialog = lazy(function importAlertDialog() {
  return import("./ios-alert-dialog").then(function selectAlertDialog(module) {
    return { default: module.IosAlertDialog };
  });
});

/** An iOS alert whose dialog code downloads the first time it opens. */
export function IosAlert(props: IosAlertProps) {
  const hasOpened = useHasOpened(props.open);
  return hasOpened ? (
    <Suspense fallback={null}>
      <IosAlertDialog {...props} />
    </Suspense>
  ) : null;
}
