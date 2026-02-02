"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { formatTimeAgo } from "@/lib/utils";
import { TASK_STATUS, TAG_COLORS, type TaskStatus } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";

const COLUMN_ORDER: TaskStatus[] = [
  "inbox",
  "assigned",
  "in_progress",
  "review",
  "done",
];

interface KanbanBoardProps {
  filterAgentId?: string;
}

export function KanbanBoard({ filterAgentId }: KanbanBoardProps) {
  const kanban = useQuery(api.tasks.getKanban);
  const isLoading = kanban === undefined;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-amber-500">◆</span>
          <h2 className="text-sm font-semibold text-stone-700 tracking-wide">
            MISSION QUEUE
          </h2>
        </div>
        {kanban && (
          <div className="text-xs text-stone-400">
            {kanban.in_progress.length} active
          </div>
        )}
      </div>

      {/* Columns */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 p-4 min-h-full">
          {COLUMN_ORDER.map((status) => {
            const tasks = kanban?.[status] || [];
            const filteredTasks = filterAgentId
              ? tasks.filter((t: any) =>
                  t.assignees?.some((a: any) => a._id === filterAgentId)
                )
              : tasks;

            return (
              <KanbanColumn
                key={status}
                status={status}
                tasks={filteredTasks}
                isLoading={isLoading}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface Task {
  _id: string;
  title: string;
  description?: string;
  priority?: "high" | "medium" | "low";
  tags?: string[];
  createdAt: number;
  assignees?: Array<{
    _id: string;
    name: string;
    emoji: string;
  } | undefined>;
}

function KanbanColumn({
  status,
  tasks,
  isLoading,
}: {
  status: TaskStatus;
  tasks: Task[];
  isLoading: boolean;
}) {
  const config = TASK_STATUS[status];

  return (
    <div className="flex-shrink-0 w-72">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-bold uppercase tracking-wide", config.headerColor)}>
            {config.label}
          </span>
        </div>
        {isLoading ? (
          <Skeleton className="w-6 h-5 rounded" />
        ) : (
          <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded">
            {tasks.length}
          </span>
        )}
      </div>

      {/* Cards Container */}
      <div
        className={cn(
          "rounded-lg p-2 min-h-[calc(100vh-220px)] space-y-2",
          config.color
        )}
      >
        {isLoading ? (
          <>
            <TaskCardSkeleton />
            <TaskCardSkeleton />
            <TaskCardSkeleton />
          </>
        ) : tasks.length > 0 ? (
          tasks.map((task) => <TaskCard key={task._id} task={task} />)
        ) : (
          <div className="py-12 text-center">
            <span className="text-2xl opacity-30">{config.icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const isHighPriority = task.priority === "high";

  return (
    <div
      className={cn(
        "bg-white rounded-lg p-3 shadow-sm border border-stone-200",
        "hover:shadow-md hover:border-stone-300 transition-all cursor-pointer",
        "group relative"
      )}
    >
      {/* Priority indicator */}
      {isHighPriority && (
        <div className="absolute top-0 left-0 w-1 h-full bg-red-400 rounded-l-lg" />
      )}

      {/* Title */}
      <h3 className="text-sm font-medium text-stone-800 mb-1.5 pr-6 line-clamp-2 group-hover:text-blue-600 transition-colors">
        {task.title}
      </h3>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-stone-500 mb-2 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.slice(0, 3).map((tag, i) => (
            <span
              key={tag}
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded",
                TAG_COLORS[i % TAG_COLORS.length]
              )}
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-[10px] text-stone-400">
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100">
        {/* Assignees */}
        <div className="flex items-center -space-x-1">
          {task.assignees?.filter(Boolean).slice(0, 3).map((assignee) => (
            <div
              key={assignee!._id}
              className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-xs border-2 border-white"
              title={assignee!.name}
            >
              {assignee!.emoji || assignee!.name[0]}
            </div>
          ))}
          {task.assignees && task.assignees.filter(Boolean).length > 3 && (
            <div className="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center text-[10px] text-stone-600 border-2 border-white">
              +{task.assignees.filter(Boolean).length - 3}
            </div>
          )}
        </div>

        {/* Time */}
        <span className="text-[10px] text-stone-400">
          {formatTimeAgo(task.createdAt)}
        </span>
      </div>

      {/* Hover arrow */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-stone-400 text-sm">→</span>
      </div>
    </div>
  );
}

function TaskCardSkeleton() {
  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-stone-200">
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-full mb-2" />
      <div className="flex gap-1 mb-2">
        <Skeleton className="h-4 w-12 rounded" />
        <Skeleton className="h-4 w-14 rounded" />
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-stone-100">
        <div className="flex -space-x-1">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="w-6 h-6 rounded-full" />
        </div>
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
