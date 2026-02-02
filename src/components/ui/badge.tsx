import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info";
  className?: string;
}

const variants = {
  default: "bg-stone-100 text-stone-600",
  success: "bg-green-500 text-white",
  warning: "bg-yellow-100 text-yellow-700",
  error: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span 
      className={cn(
        "text-xs px-2 py-1 rounded-full font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
