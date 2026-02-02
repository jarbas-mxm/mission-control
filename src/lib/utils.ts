import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes intelligently
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format timestamp as relative time (e.g., "2h ago")
 * Handles edge cases: future dates, invalid timestamps
 */
export function formatTimeAgo(timestamp: number | undefined): string {
  if (!timestamp || timestamp <= 0) return "never";
  
  const now = Date.now();
  const diff = now - timestamp;
  
  // Future timestamp - show "just now" instead of negative
  if (diff < 0) return "just now";
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 30) return `${Math.floor(days / 30)}mo ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

/**
 * Format date for task cards
 */
export function formatTaskDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  }) + " • " + date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Group array by key
 */
export function groupBy<T, K extends string>(
  array: T[],
  getKey: (item: T) => K
): Record<K, T[]> {
  return array.reduce((acc, item) => {
    const key = getKey(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

/**
 * Sort agents: working first, then idle, then offline
 */
export function sortAgentsByStatus<T extends { status: string }>(agents: T[]): T[] {
  const order = { working: 0, idle: 1, offline: 2 };
  return [...agents].sort((a, b) => 
    (order[a.status as keyof typeof order] ?? 3) - 
    (order[b.status as keyof typeof order] ?? 3)
  );
}
