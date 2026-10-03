"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { cn } from "@workspace/ui/lib/utils";
import { useId, useRef } from "react";

import { iosStrongGlassClassName } from "./ios-glass";
import { useIosPortalContainer } from "./ios-portal-container";

export interface IosAlertAction {
  disabled?: boolean;
  label: string;
  onSelect: () => void;
  role: "cancel" | "default" | "destructive";
  preferred?: boolean;
}

interface IosAlertTextField {
  label: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  value: string;
}

export interface IosAlertProps {
  actions: readonly IosAlertAction[];
  message?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  textField?: IosAlertTextField;
  title: string;
}

export function IosAlertDialog({
  actions,
  message,
  onOpenChange,
  open,
  textField,
  title,
}: IosAlertProps) {
  const portalContainer = useIosPortalContainer();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const stacksActions = actions.length > 2;
  const preferredAction = actions.find(function isPreferred(action) {
    return action.preferred && !action.disabled;
  });

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal container={portalContainer}>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/25 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none dark:bg-black/45" />
        <AlertDialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <AlertDialog.Popup
            initialFocus={textField ? inputRef : true}
            className={cn(
              "w-[min(300px,calc(100vw-48px))] rounded-[34px] p-[22px] text-left text-(--ios-label) transition-[scale,opacity] duration-300 ease-[cubic-bezier(0.34,1.3,0.64,1)] outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:scale-[1.12] data-starting-style:opacity-0 motion-reduce:transition-none",
              iosStrongGlassClassName,
            )}
          >
            <form
              className="flex flex-col gap-5"
              onSubmit={function submitPreferredAction(event) {
                event.preventDefault();
                preferredAction?.onSelect();
              }}
            >
              <div className="flex flex-col gap-1">
                <AlertDialog.Title className="text-[17px] leading-[22px] font-semibold tracking-[-0.43px]">
                  {title}
                </AlertDialog.Title>
                {message ? (
                  <AlertDialog.Description className="text-[15px] leading-5 tracking-[-0.23px] text-(--ios-label)/80">
                    {message}
                  </AlertDialog.Description>
                ) : null}
                {textField ? (
                  <>
                    <label htmlFor={inputId} className="sr-only">
                      {textField.label}
                    </label>
                    <input
                      ref={inputRef}
                      id={inputId}
                      autoComplete="off"
                      value={textField.value}
                      placeholder={textField.placeholder}
                      onChange={function updateValue(event) {
                        textField.onValueChange(event.currentTarget.value);
                      }}
                      className="mt-3 h-11 w-full rounded-full bg-(--ios-tertiary-fill) px-4 text-[16px] text-(--ios-label) outline-none placeholder:text-(--ios-tertiary-label) focus:ring-2 focus:ring-(--ios-tint)/70"
                    />
                  </>
                ) : null}
              </div>
              <div
                className={cn(
                  "grid gap-2",
                  stacksActions
                    ? "grid-cols-1"
                    : actions.length === 2
                      ? "grid-cols-2"
                      : "grid-cols-1",
                )}
              >
                {actions.map(function renderAction(action) {
                  return (
                    <button
                      key={action.label}
                      type={action === preferredAction ? "submit" : "button"}
                      disabled={action.disabled}
                      onClick={
                        action === preferredAction
                          ? undefined
                          : function selectAction() {
                              action.onSelect();
                            }
                      }
                      className={cn(
                        "h-12 truncate rounded-full bg-(--ios-fill) px-3 text-[17px] leading-[22px] font-medium tracking-[-0.43px] text-(--ios-label) transition-transform duration-150 outline-none focus-visible:ring-2 focus-visible:ring-(--ios-tint) active:scale-95 disabled:opacity-40 motion-reduce:transition-none",
                        action.role === "destructive" && "text-(--ios-red)",
                        action.preferred &&
                          "bg-(--ios-tint) font-semibold text-white dark:text-black",
                      )}
                    >
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </form>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
