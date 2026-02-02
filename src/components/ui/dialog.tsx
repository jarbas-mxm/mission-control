"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = useContext(DialogContext);
  if (!context) throw new Error("Dialog components must be used within Dialog");
  return context;
}

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const setOpen = (value: boolean) => {
    if (!isControlled) setInternalOpen(value);
    onOpenChange?.(value);
  };

  return (
    <DialogContext.Provider value={{ open: isOpen, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const { setOpen } = useDialogContext();

  if (asChild) {
    // Clone child and add onClick
    const child = children as React.ReactElement;
    return (
      <span onClick={() => setOpen(true)}>
        {child}
      </span>
    );
  }

  return (
    <button onClick={() => setOpen(true)} type="button">
      {children}
    </button>
  );
}

export function DialogContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open, setOpen } = useDialogContext();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 animate-in fade-in-0"
        onClick={() => setOpen(false)}
      />
      {/* Content */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className={cn(
            "relative bg-white rounded-lg shadow-xl max-h-[90vh] overflow-auto",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2",
            "w-full max-w-lg",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
          {/* Close button */}
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 text-stone-400 hover:text-stone-600"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

export function DialogHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-6 pt-6 pb-2", className)}>
      {children}
    </div>
  );
}

export function DialogTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("text-lg font-semibold text-stone-900", className)}>
      {children}
    </h2>
  );
}

export function DialogDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-sm text-stone-500 mt-1", className)}>
      {children}
    </p>
  );
}

export function DialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-6 py-4 bg-stone-50 flex justify-end gap-2", className)}>
      {children}
    </div>
  );
}
