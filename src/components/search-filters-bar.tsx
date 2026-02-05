"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

type Priority = "all" | "high" | "medium" | "low";
type SortBy = "newest" | "oldest" | "priority";

export interface FilterState {
  search: string;
  priority: Priority;
  sortBy: SortBy;
  showDone: boolean;
}

interface SearchFiltersBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  agentFilter?: { id: string; name: string } | null;
  onAgentFilterClear?: () => void;
  taskCounts?: {
    total: number;
    high: number;
    medium: number;
    low: number;
    done: number;
  };
}

export function SearchFiltersBar({
  filters,
  onFiltersChange,
  agentFilter,
  onAgentFilterClear,
  taskCounts,
}: SearchFiltersBarProps) {
  const [searchFocused, setSearchFocused] = useState(false);

  const updateFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      onFiltersChange({ ...filters, [key]: value });
    },
    [filters, onFiltersChange]
  );

  const hasFilters =
    filters.search !== "" ||
    filters.priority !== "all" ||
    agentFilter !== null ||
    filters.showDone;

  const clearAllFilters = useCallback(() => {
    onFiltersChange({
      search: "",
      priority: "all",
      sortBy: "newest",
      showDone: false,
    });
    onAgentFilterClear?.();
  }, [onFiltersChange, onAgentFilterClear]);

  return (
    <div className="bg-white border-b border-stone-200 px-3 md:px-4 py-2 md:py-3">
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        {/* Search Input */}
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all flex-1 min-w-[200px] max-w-md",
            searchFocused
              ? "border-blue-400 ring-2 ring-blue-100"
              : "border-stone-200 hover:border-stone-300"
          )}
        >
          <span className="text-stone-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-stone-400"
          />
          {filters.search && (
            <button
              onClick={() => updateFilter("search", "")}
              className="text-stone-400 hover:text-stone-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-6 bg-stone-200" />

        {/* Priority Filters */}
        <div className="flex items-center gap-1">
          <PriorityPill
            label="All"
            isActive={filters.priority === "all"}
            onClick={() => updateFilter("priority", "all")}
            count={taskCounts?.total}
          />
          <PriorityPill
            label="⚡"
            title="High Priority"
            isActive={filters.priority === "high"}
            onClick={() => updateFilter("priority", "high")}
            count={taskCounts?.high}
            colorClass="text-red-600"
          />
          <PriorityPill
            label="●"
            title="Medium Priority"
            isActive={filters.priority === "medium"}
            onClick={() => updateFilter("priority", "medium")}
            count={taskCounts?.medium}
            colorClass="text-amber-500"
          />
          <PriorityPill
            label="○"
            title="Low Priority"
            isActive={filters.priority === "low"}
            onClick={() => updateFilter("priority", "low")}
            count={taskCounts?.low}
            colorClass="text-stone-400"
          />
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-6 bg-stone-200" />

        {/* Show Done Toggle */}
        <button
          onClick={() => updateFilter("showDone", !filters.showDone)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all",
            filters.showDone
              ? "bg-green-100 text-green-700"
              : "text-stone-500 hover:bg-stone-100"
          )}
          title={filters.showDone ? "Hide completed tasks" : "Show completed tasks"}
        >
          <span>✓</span>
          <span className="hidden sm:inline">Done</span>
          {taskCounts?.done !== undefined && taskCounts.done > 0 && (
            <span
              className={cn(
                "px-1.5 rounded-full text-[10px]",
                filters.showDone ? "bg-green-200" : "bg-stone-200"
              )}
            >
              {taskCounts.done}
            </span>
          )}
        </button>

        {/* Sort Dropdown */}
        <select
          value={filters.sortBy}
          onChange={(e) => updateFilter("sortBy", e.target.value as SortBy)}
          className="text-xs px-2 py-1.5 rounded border border-stone-200 bg-white text-stone-600 cursor-pointer hover:border-stone-300 outline-none"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="priority">By priority</option>
        </select>

        {/* Agent Filter Badge */}
        {agentFilter && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-full text-xs">
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

        {/* Clear All */}
        {hasFilters && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-stone-500 hover:text-stone-700 px-2 py-1 hover:bg-stone-100 rounded transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}

function PriorityPill({
  label,
  title,
  isActive,
  onClick,
  count,
  colorClass,
}: {
  label: string;
  title?: string;
  isActive: boolean;
  onClick: () => void;
  count?: number;
  colorClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1",
        isActive
          ? "bg-blue-600 text-white"
          : cn(
              "bg-stone-100 hover:bg-stone-200",
              colorClass || "text-stone-600"
            )
      )}
    >
      <span className={cn(!isActive && colorClass)}>{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            "text-[10px]",
            isActive ? "text-blue-200" : "text-stone-400"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
