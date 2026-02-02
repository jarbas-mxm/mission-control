"use client";

import { cn } from "@/lib/utils";
import { formatTaskDate } from "@/lib/utils";
import { PRIORITY } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";

interface Agent {
  _id: string;
  name: string;
  emoji: string;
}

interface Task {
  _id: string;
  title: string;
  description?: string;
  priority?: "high" | "medium" | "low";
  assigneeIds: string[];
  tags?: string[];
  createdAt: number;
}

interface TaskCardProps {
  task: Task;
  agents?: Agent[];
  onClick?: () => void;
}

export function TaskCard({ task, agents, onClick }: TaskCardProps) {
  const assignees = task.assigneeIds
    .map(id => agents?.find(a => a._id === id))
    .filter(Boolean) as Agent[];
  
  const isHighPriority = task.priority === "high";
  const visibleTags = task.tags?.slice(0, 3) || [];
  const extraTagsCount = (task.tags?.length || 0) - 3;

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-lg p-3 shadow-sm border border-stone-200",
        "hover:shadow-md transition-all group",
        onClick && "cursor-pointer"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-medium text-stone-800 text-sm group-hover:text-blue-600 transition-colors line-clamp-2">
          {task.title}
        </h3>
        {isHighPriority && (
          <span className="text-red-500 flex-shrink-0" title="High priority">
            {PRIORITY.high.icon}
          </span>
        )}
      </div>

      {/* Date */}
      <div className="text-xs text-stone-400 mb-2 flex items-center gap-1">
        <span>📅</span>
        <span>{formatTaskDate(task.createdAt)}</span>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-stone-500 mb-2 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Assignees */}
      {assignees.length > 0 && (
        <div className="flex items-center gap-1 mb-2 flex-wrap">
          {assignees.map((agent) => (
            <div
              key={agent._id}
              className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs"
              title={agent.name}
            >
              <span>{agent.emoji}</span>
              <span className="hidden sm:inline">{agent.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tags */}
      {visibleTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded"
            >
              {tag}
            </span>
          ))}
          {extraTagsCount > 0 && (
            <span className="text-xs text-stone-400">+{extraTagsCount}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-stone-200">
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2 mb-2" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}
