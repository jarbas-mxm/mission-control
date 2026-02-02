"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  className,
  disabled,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          "w-full h-10 px-3 text-left text-sm rounded-md border border-stone-200",
          "bg-white hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500",
          "flex items-center justify-between",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className={selected ? "text-stone-900" : "text-stone-400"}>
          {selected?.label || placeholder}
        </span>
        <span className="text-stone-400">▼</span>
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onValueChange?.(option.value);
                setOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-left text-sm hover:bg-stone-50",
                option.value === value && "bg-stone-100 font-medium"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
