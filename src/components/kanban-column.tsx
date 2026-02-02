"use client";

import { TASK_STATUS, type TaskStatus } from "@/lib/constants";
import { TaskCard, TaskCardSkeleton } from "@/components/task-card";
import { Skeleton } from "@/components/ui/skeleton";

interface Task {
  _id: string;
  title: string;
  description?: string;
  priority?: "high" | "medium" | "low";
  assigneeIds: any[];
  tags?: string[];
  createdAt: number;
  status: string;
}

interface Agent {
  _id: string;
  name: string;
  emoji: string;
}

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  agents?: Agent[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export function KanbanColumn({ 
  status, 
  tasks, 
  agents, 
  isLoading,
  emptyMessage = "Empty"
}: KanbanColumnProps) {
  const config = TASK_STATUS[status];

  return (
    <div className="flex-shrink-0 w-64 lg:w-72">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{config.icon}</span>
        <span className="text-xs font-semibold text-stone-600 uppercase">
          {config.label}
        </span>
        {isLoading ? (
          <Skeleton className="h-5 w-6 rounded-full" />
        ) : (
          <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        )}
      </div>

      {/* Content */}
      <div 
        className={`${config.color} rounded-lg p-2 min-h-[200px] max-h-[calc(100vh-280px)] overflow-y-auto space-y-2`}
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
              agents={agents}
            />
          ))
        ) : (
          <div className="text-center text-stone-400 text-sm py-8">
            <div className="text-2xl mb-1 opacity-50">{config.icon}</div>
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}
