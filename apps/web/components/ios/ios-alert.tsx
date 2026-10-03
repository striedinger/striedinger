"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { cn } from "@workspace/ui/lib/utils";
import { useId, useRef } from "react";

import { useIosPortalContainer } from "./ios-portal-container";

interface IosAlertAction {
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

interface IosAlertProps {
  actions: readonly IosAlertAction[];
  message?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  textField?: IosAlertTextField;
  title: string;
}

export function IosAlert({
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
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/20 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none dark:bg-black/45" />
        <AlertDialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <AlertDialog.Popup
            initialFocus={textField ? inputRef : true}
            className="w-[270px] overflow-hidden rounded-[14px] bg-(--ios-menu) text-center text-(--ios-label) shadow-[0_10px_40px_rgb(0_0_0/0.18)] backdrop-blur-2xl backdrop-saturate-180 transition-[scale,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none data-ending-style:opacity-0 data-starting-style:scale-[1.15] data-starting-style:opacity-0 motion-reduce:transition-none"
          >
            <form
              onSubmit={function submitPreferredAction(event) {
                event.preventDefault();
                preferredAction?.onSelect();
              }}
            >
              <div className="flex flex-col gap-0.5 px-4 pt-[19px] pb-[18px]">
                <AlertDialog.Title className="text-[17px] leading-[22px] font-semibold tracking-[-0.43px]">
                  {title}
                </AlertDialog.Title>
                {message ? (
                  <AlertDialog.Description className="text-[13px] leading-[18px] tracking-[-0.08px]">
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
                      className="mt-3.5 h-[30px] w-full rounded-[7px] border border-(--ios-separator) bg-(--ios-tertiary-background) px-1.5 text-left text-[16px] text-(--ios-label) outline-none placeholder:text-(--ios-tertiary-label) focus:border-(--ios-tint)"
                    />
                  </>
                ) : null}
              </div>
              <div
                className={cn(
                  "grid border-t-[0.5px] border-(--ios-separator)",
                  stacksActions
                    ? "grid-cols-1 divide-y-[0.5px] divide-(--ios-separator)"
                    : actions.length === 2
                      ? "grid-cols-2 divide-x-[0.5px] divide-(--ios-separator)"
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
                        "h-11 px-2 text-[17px] leading-[22px] tracking-[-0.43px] text-(--ios-tint) outline-none focus-visible:bg-(--ios-fill) active:bg-(--ios-fill) disabled:text-(--ios-tertiary-label)",
                        action.role === "destructive" && "text-(--ios-red)",
                        action.preferred && "font-semibold",
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
