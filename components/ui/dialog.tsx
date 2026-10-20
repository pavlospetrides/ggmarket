"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />;
}

const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

function DialogContent({ className, children, closeLabel = "Close", ...props }: ComponentProps<typeof DialogPrimitive.Content> & { closeLabel?: string }) {
  return <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-black/80 data-[state=closed]:animate-[fade-out_.16s_ease-in] data-[state=open]:animate-[fade-in_.16s_ease-out]" />
    <DialogPrimitive.Content
      className={cn("fixed left-1/2 top-1/2 z-[71] max-h-[calc(100dvh-2rem)] w-[min(calc(100%-2rem),32rem)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-[var(--radius-xl)] bg-[var(--surface)] p-6 outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-hover)]", className)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="icon-btn absolute right-4 top-4" aria-label={closeLabel}>
        <X aria-hidden="true" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>;
}

function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("pr-12 text-xl font-bold", className)} {...props} />;
}

function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("mt-2 text-sm leading-6 text-[var(--text-secondary)]", className)} {...props} />;
}

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogTitle, DialogDescription };
