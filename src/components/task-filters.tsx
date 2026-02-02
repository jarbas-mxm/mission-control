"use client";

import { cn } from "@/lib/utils";

type Priority = "all" | "high" | "medium" | "low";

interface TaskFiltersProps {
  priority: Priority;
  onPriorityChange: (priority: Priority) => void;
  agentFilter: { id: string; name: string } | null;
  onAgentFilterClear: () => void;
  taskCounts: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
}

function FilterPill({ 
  label, 
  isActive, 
  onClick, 
  count 
}: { 
  label: string; 
  isActive: boolean; 
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
        isActive
          ? "bg-blue-600 text-white"
          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
      )}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={cn("ml-1.5", isActive ? "text-blue-200" : "text-stone-400")}>
          {count}
        </span>
      )}
    </button>
  );
}

export function TaskFilters({
  priority,
  onPriorityChange,
  agentFilter,
  onAgentFilterClear,
  taskCounts,
}: TaskFiltersProps) {
  const hasFilters = priority !== "all" || agentFilter !== null;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs text-stone-500 mr-1">Filter:</span>
      
      <FilterPill 
        label="All" 
        isActive={priority === "all"} 
        onClick={() => onPriorityChange("all")}
      />
      <FilterPill 
        label="⚡ High" 
        isActive={priority === "high"} 
        onClick={() => onPriorityChange("high")}
        count={taskCounts.high}
      />
      <FilterPill 
        label="Medium" 
        isActive={priority === "medium"} 
        onClick={() => onPriorityChange("medium")}
        count={taskCounts.medium}
      />
      <FilterPill 
        label="Low" 
        isActive={priority === "low"} 
        onClick={() => onPriorityChange("low")}
        count={taskCounts.low}
      />

      {agentFilter && (
        <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-blue-100 rounded-full text-xs">
          <span className="text-blue-700">👤 {agentFilter.name}</span>
          <button 
            onClick={onAgentFilterClear}
            className="text-blue-500 hover:text-blue-700 ml-1"
            aria-label="Clear agent filter"
          >
            ✕
          </button>
        </div>
      )}

      {hasFilters && (
        <button
          onClick={() => {
            onPriorityChange("all");
            onAgentFilterClear();
          }}
          className="text-xs text-stone-500 hover:text-stone-700 ml-2"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
