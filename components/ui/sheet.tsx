"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Sheet(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />;
}

const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

function SheetContent({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  return <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay data-testid="sheet-overlay" className="fixed inset-0 z-[60] bg-black/80 data-[state=closed]:animate-[fade-out_.16s_ease-in] data-[state=open]:animate-[fade-in_.16s_ease-out]" />
    <DialogPrimitive.Content
      className={cn("fixed inset-x-0 bottom-0 z-[61] flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[1.5rem] bg-[var(--surface)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-hover)] data-[state=closed]:animate-[sheet-down_.2s_ease-in] data-[state=open]:animate-[sheet-up_.22s_ease-out]", className)}
      {...props}
    >
      <DialogPrimitive.Close className="icon-btn absolute right-4 top-4" aria-label="Close filters">
        <X aria-hidden="true" />
      </DialogPrimitive.Close>
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>;
}

function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-5 pb-4 pt-5 pr-16", className)} {...props} />;
}

function SheetTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("text-xl font-bold", className)} {...props} />;
}

function SheetDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("mt-1 text-sm text-[var(--text-secondary)]", className)} {...props} />;
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription };
