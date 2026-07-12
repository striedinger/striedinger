"use client";

import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@workspace/ui/lib/utils";

const Sheet = Dialog.Root;
const SheetTrigger = Dialog.Trigger;
const SheetClose = Dialog.Close;
const SheetTitle = Dialog.Title;
const SheetDescription = Dialog.Description;

function SheetContent({ className, children, ...props }: Dialog.Popup.Props) {
  return (
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/35 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none" />
      <Dialog.Viewport className="fixed inset-0 z-50 flex justify-end overscroll-contain">
        <Dialog.Popup
          data-slot="sheet-content"
          className={cn(
            "h-dvh w-[min(22rem,88vw)] overflow-y-auto border-l border-border bg-background p-6 text-foreground shadow-xl transition-transform duration-300 data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full motion-reduce:transition-none",
            className,
          )}
          {...props}
        >
          {children}
        </Dialog.Popup>
      </Dialog.Viewport>
    </Dialog.Portal>
  );
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger };
