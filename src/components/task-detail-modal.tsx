"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { TASK_STATUS, type TaskStatus } from "@/lib/constants";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TaskDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: Id<"tasks">;
}

export function TaskDetailModal({ open, onOpenChange, taskId }: TaskDetailModalProps) {
  const task = useQuery(api.tasks.getDetail, taskId ? { id: taskId } : "skip");

  if (!task) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="p-8 text-center text-stone-400">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  const statusConfig = TASK_STATUS[task.status as TaskStatus];

  const getDeliverableIcon = (type?: string) => {
    const icons: Record<string, string> = {
      file: "📄",
      link: "🔗",
      sheet: "📊",
      doc: "📝",
      other: "📎",
    };
    return icons[type || "link"] || "🔗";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {task.priority === "high" && (
              <span className="text-red-500 text-lg flex-shrink-0">⚡</span>
            )}
            <div className="flex-1">
              <DialogTitle className="text-lg leading-tight">
                {task.taskNumber && (
                  <span className="text-stone-400 font-normal mr-2">
                    #{String(task.taskNumber).padStart(3, '0')}
                  </span>
                )}
                {task.title}
              </DialogTitle>
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-2",
                statusConfig.color,
                statusConfig.headerColor
              )}>
                {statusConfig.icon} {statusConfig.label}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Description */}
          {task.description && (
            <div>
              <p className="text-sm text-stone-600 whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* Deliverables - only show if there are any */}
          {task.deliverables && task.deliverables.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
                Downloads
              </h3>
              <div className="space-y-2">
                {task.deliverables.map((d: any, i: number) => (
                  <a
                    key={i}
                    href={d.url.startsWith("http") ? d.url : `file://${d.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-stone-50 hover:bg-stone-100 rounded-lg transition-colors group"
                  >
                    <span className="text-lg">{getDeliverableIcon(d.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-stone-700 group-hover:text-blue-600 truncate">
                        {d.title}
                      </div>
                      <div className="text-xs text-stone-400 truncate">
                        {d.url}
                      </div>
                    </div>
                    <span className="text-stone-400 group-hover:text-blue-600 text-sm">
                      ↗
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Empty state for no description and no deliverables */}
          {!task.description && (!task.deliverables || task.deliverables.length === 0) && (
            <p className="text-sm text-stone-400 text-center py-4">
              No details available
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
