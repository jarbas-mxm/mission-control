"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { formatTimeAgo } from "@/lib/utils";
import { TASK_STATUS, TAG_COLORS, type TaskStatus } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TaskDetailModal } from "@/components/task-detail-modal";
import type { Id } from "../../convex/_generated/dataModel";

const COLUMN_ORDER: TaskStatus[] = [
  "inbox",
  "assigned",
  "in_progress",
  "done",
];

interface KanbanBoardProps {
  filterAgentId?: string;
  onCreateTask?: () => void;
}

export function KanbanBoard({ filterAgentId, onCreateTask }: KanbanBoardProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(null);
  const kanban = useQuery(api.tasks.getKanban);
  const isLoading = kanban === undefined;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 md:px-4 py-2 md:py-3 border-b border-stone-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-amber-500">◆</span>
          <h2 className="text-xs md:text-sm font-semibold text-stone-700 tracking-wide">
            MISSION QUEUE
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {kanban && (
            <span className="text-xs text-stone-400">
              {kanban.in_progress.length} active
            </span>
          )}
          {onCreateTask && (
            <Button onClick={onCreateTask} size="sm" className="hidden md:inline-flex">
              + Task
            </Button>
          )}
        </div>
      </div>

      {/* Columns - horizontal scroll on all screens */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 md:gap-4 p-3 md:p-4 min-h-full min-w-max">
          {COLUMN_ORDER.map((status) => {
            const tasks = kanban?.[status] || [];
            const filteredTasks = filterAgentId
              ? tasks.filter((t) =>
                  t.assignees?.some((a) => a?._id === filterAgentId)
                )
              : tasks;

            return (
              <KanbanColumn
                key={status}
                status={status}
                tasks={filteredTasks as Task[]}
                isLoading={isLoading}
                onOpenTask={setSelectedTaskId}
              />
            );
          })}
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTaskId && (
        <TaskDetailModal
          open={!!selectedTaskId}
          onOpenChange={(open) => !open && setSelectedTaskId(null)}
          taskId={selectedTaskId}
        />
      )}
    </div>
  );
}

interface Task {
  _id: Id<"tasks">;
  taskNumber?: number;
  title: string;
  description?: string;
  status: string;
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
  onOpenTask,
}: {
  status: TaskStatus;
  tasks: Task[];
  isLoading: boolean;
  onOpenTask?: (taskId: Id<"tasks">) => void;
}) {
  const config = TASK_STATUS[status];

  return (
    <div className="flex-shrink-0 w-64 md:w-72">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-2 md:mb-3 px-1">
        <div className="flex items-center gap-1.5 md:gap-2">
          <span className="text-sm md:text-base">{config.icon}</span>
          <span
            className={cn(
              "text-[10px] md:text-xs font-bold uppercase tracking-wide",
              config.headerColor
            )}
          >
            {config.label}
          </span>
        </div>
        {isLoading ? (
          <Skeleton className="w-5 h-4 md:w-6 md:h-5 rounded" />
        ) : (
          <span className="text-[10px] md:text-xs text-stone-400 bg-stone-100 px-1.5 md:px-2 py-0.5 rounded">
            {tasks.length}
          </span>
        )}
      </div>

      {/* Cards Container */}
      <div
        className={cn(
          "rounded-lg p-1.5 md:p-2 min-h-[calc(100vh-280px)] md:min-h-[calc(100vh-220px)] space-y-1.5 md:space-y-2 overflow-y-auto",
          config.color
        )}
      >
        {isLoading ? (
          <>
            <TaskCardSkeleton />
            <TaskCardSkeleton />
          </>
        ) : tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onOpenDetail={() => onOpenTask?.(task._id)}
            />
          ))
        ) : (
          <div className="py-8 md:py-12 text-center">
            <span className="text-xl md:text-2xl opacity-30">{config.icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, onOpenDetail }: { task: Task; onOpenDetail?: () => void }) {
  const [showMenu, setShowMenu] = useState(false);
  const updateStatus = useMutation(api.tasks.updateStatus);
  const deleteTask = useMutation(api.tasks.remove);

  const isHighPriority = task.priority === "high";

  const handleMove = async (newStatus: TaskStatus) => {
    try {
      await updateStatus({ id: task._id, status: newStatus });
    } catch (err) {
      // Error handling - could add toast notification here
    }
    setShowMenu(false);
  };

  const handleDelete = async () => {
    if (confirm("Delete this task?")) {
      try {
        await deleteTask({ id: task._id });
      } catch (err) {
        // Error handling
      }
    }
    setShowMenu(false);
  };

  return (
    <div
      onClick={() => !showMenu && onOpenDetail?.()}
      className={cn(
        "bg-white rounded-lg p-2.5 md:p-3 shadow-sm border border-stone-200",
        "hover:shadow-md hover:border-stone-300 transition-all cursor-pointer",
        "group relative"
      )}
    >
      {/* Priority indicator */}
      {isHighPriority && (
        <div className="absolute top-0 left-0 w-1 h-full bg-red-400 rounded-l-lg" />
      )}

      {/* Menu Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded hover:bg-stone-100 opacity-0 group-hover:opacity-100 transition-opacity text-stone-400 z-10"
      >
        ⋯
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute top-8 right-2 z-20 bg-white border border-stone-200 rounded-lg shadow-lg py-1 min-w-[140px]">
            <div className="px-2 py-1 text-[10px] text-stone-400 uppercase">
              Move to
            </div>
            {COLUMN_ORDER.filter((s) => s !== task.status).map((status) => (
              <button
                key={status}
                onClick={() => handleMove(status)}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-stone-50 flex items-center gap-2"
              >
                <span>{TASK_STATUS[status].icon}</span>
                <span>{TASK_STATUS[status].label}</span>
              </button>
            ))}
            <div className="border-t border-stone-100 mt-1 pt-1">
              <button
                onClick={handleDelete}
                className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* Title with ID */}
      <h3 className="text-xs md:text-sm font-medium text-stone-800 mb-1 md:mb-1.5 pr-6 line-clamp-2">
        {task.taskNumber && (
          <span className="text-stone-400 font-normal mr-1">
            #{String(task.taskNumber).padStart(3, '0')}
          </span>
        )}
        {task.title}
      </h3>

      {/* Description preview */}
      {task.description && (
        <p className="text-[10px] md:text-xs text-stone-500 mb-1.5 md:mb-2 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5 md:mb-2">
          {task.tags.slice(0, 3).map((tag, i) => (
            <span
              key={tag}
              className={cn(
                "text-[9px] md:text-[10px] px-1 md:px-1.5 py-0.5 rounded",
                TAG_COLORS[i % TAG_COLORS.length]
              )}
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-[9px] md:text-[10px] text-stone-400">
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-1.5 md:mt-2 pt-1.5 md:pt-2 border-t border-stone-100">
        {/* Assignees */}
        <div className="flex items-center -space-x-1">
          {task.assignees
            ?.filter(Boolean)
            .slice(0, 3)
            .map((assignee) => (
              <div
                key={assignee!._id}
                className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-stone-100 flex items-center justify-center text-[10px] md:text-xs border-2 border-white"
                title={assignee!.name}
              >
                {assignee!.emoji || assignee!.name[0]}
              </div>
            ))}
          {task.assignees && task.assignees.filter(Boolean).length > 3 && (
            <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-stone-200 flex items-center justify-center text-[8px] md:text-[10px] text-stone-600 border-2 border-white">
              +{task.assignees.filter(Boolean).length - 3}
            </div>
          )}
        </div>

        {/* Time */}
        <span className="text-[9px] md:text-[10px] text-stone-400">
          {formatTimeAgo(task.createdAt)}
        </span>
      </div>
    </div>
  );
}

function TaskCardSkeleton() {
  return (
    <div className="bg-white rounded-lg p-2.5 md:p-3 shadow-sm border border-stone-200">
      <Skeleton className="h-3 md:h-4 w-3/4 mb-2" />
      <Skeleton className="h-2.5 md:h-3 w-full mb-2" />
      <div className="flex gap-1 mb-2">
        <Skeleton className="h-3 md:h-4 w-10 md:w-12 rounded" />
        <Skeleton className="h-3 md:h-4 w-12 md:w-14 rounded" />
      </div>
      <div className="flex justify-between items-center pt-1.5 md:pt-2 border-t border-stone-100">
        <div className="flex -space-x-1">
          <Skeleton className="w-5 h-5 md:w-6 md:h-6 rounded-full" />
          <Skeleton className="w-5 h-5 md:w-6 md:h-6 rounded-full" />
        </div>
        <Skeleton className="h-2.5 md:h-3 w-12 md:w-16" />
      </div>
    </div>
  );
}
