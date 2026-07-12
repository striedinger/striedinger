"use client";

import { RefreshIcon } from "@workspace/icons/refresh-icon";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { Text } from "@workspace/ui/components/text";

interface RestartGameDialogProps {
  cancelLabel: string;
  confirmLabel: string;
  description: string;
  onConfirm: () => void;
  title: string;
  triggerLabel: string;
}

export function RestartGameDialog({
  cancelLabel,
  confirmLabel,
  description,
  onConfirm,
  title,
  triggerLabel,
}: RestartGameDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={triggerLabel}
            className="shrink-0 transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96]"
          />
        }
      >
        <RefreshIcon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <AlertDialogTitle render={<Text as="h2" size="2xl" weight="semibold" />}>
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription render={<Text tone="muted" className="leading-relaxed" />}>
              {description}
            </AlertDialogDescription>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogClose render={<Button type="button" variant="outline" />}>
              <Text as="span" size="sm" weight="medium">
                {cancelLabel}
              </Text>
            </AlertDialogClose>
            <AlertDialogClose
              render={<Button type="button" variant="destructive" onClick={onConfirm} />}
            >
              <Text as="span" size="sm" weight="medium" className="text-white">
                {confirmLabel}
              </Text>
            </AlertDialogClose>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
