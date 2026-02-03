"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { formatTimeAgo, formatTaskDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { TASK_STATUS, PRIORITY, type TaskStatus } from "@/lib/constants";
import type { Id } from "../../convex/_generated/dataModel";

interface TaskDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: Id<"tasks">;
}

export function TaskDetailModal({ open, onOpenChange, taskId }: TaskDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"details" | "history" | "comments">("details");
  const [newDeliverableTitle, setNewDeliverableTitle] = useState("");
  const [newDeliverableUrl, setNewDeliverableUrl] = useState("");
  const [newDeliverableType, setNewDeliverableType] = useState<string>("link");
  const [showAddDeliverable, setShowAddDeliverable] = useState(false);
  const [newComment, setNewComment] = useState("");

  const task = useQuery(api.tasks.getDetail, taskId ? { id: taskId } : "skip");
  const updateStatus = useMutation(api.tasks.updateStatus);
  const addDeliverable = useMutation(api.tasks.addDeliverable);
  const removeDeliverable = useMutation(api.tasks.removeDeliverable);
  const addComment = useMutation(api.tasks.addComment);

  if (!task) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <div className="p-8 text-center text-stone-400">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  const statusConfig = TASK_STATUS[task.status as TaskStatus];
  const priorityConfig = PRIORITY[task.priority as keyof typeof PRIORITY] || PRIORITY.medium;

  const handleAddDeliverable = async () => {
    if (!newDeliverableTitle.trim() || !newDeliverableUrl.trim()) return;
    
    await addDeliverable({
      taskId,
      title: newDeliverableTitle.trim(),
      url: newDeliverableUrl.trim(),
      type: newDeliverableType as any,
    });
    
    setNewDeliverableTitle("");
    setNewDeliverableUrl("");
    setShowAddDeliverable(false);
  };

  const handleRemoveDeliverable = async (url: string) => {
    if (confirm("Remove this deliverable?")) {
      await removeDeliverable({ taskId, url });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    await addComment({
      taskId,
      content: newComment.trim(),
      senderName: "Marcel", // TODO: Get from auth context
    });
    
    setNewComment("");
  };

  const handleStatusChange = async (newStatus: string) => {
    await updateStatus({ id: taskId, status: newStatus as TaskStatus });
  };

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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start gap-3 pr-8">
            {/* Priority indicator */}
            {task.priority === "high" && (
              <span className="text-red-500 text-lg">⚡</span>
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
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {/* Status badge */}
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium",
                  statusConfig.color,
                  statusConfig.headerColor
                )}>
                  {statusConfig.icon} {statusConfig.label}
                </span>
                {/* Priority badge */}
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs",
                  priorityConfig.bg,
                  priorityConfig.color
                )}>
                  {priorityConfig.label}
                </span>
                {/* Tags */}
                {task.tags?.slice(0, 3).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded text-xs bg-stone-100 text-stone-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 px-6 -mx-6 flex-shrink-0">
          <button
            onClick={() => setActiveTab("details")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === "details"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-stone-500 hover:text-stone-700"
            )}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === "history"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-stone-500 hover:text-stone-700"
            )}
          >
            History ({task.activities?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("comments")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === "comments"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-stone-500 hover:text-stone-700"
            )}
          >
            Comments ({task.comments?.length || 0})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 -mx-6">
          {activeTab === "details" && (
            <div className="py-4 space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-sm font-medium text-stone-700 mb-2">Description</h3>
                <p className="text-sm text-stone-600 whitespace-pre-wrap bg-stone-50 p-3 rounded-lg">
                  {task.description || "No description"}
                </p>
              </div>

              {/* Assignees */}
              <div>
                <h3 className="text-sm font-medium text-stone-700 mb-2">Assignees</h3>
                <div className="flex flex-wrap gap-2">
                  {task.assignees?.length ? (
                    task.assignees.map((assignee: any) => (
                      <div
                        key={assignee._id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 rounded-full text-sm"
                      >
                        <span>{assignee.emoji}</span>
                        <span className="font-medium">{assignee.name}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-stone-400">No assignees</span>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-sm font-medium text-stone-700 mb-2">Timeline</h3>
                <div className="text-sm text-stone-600 space-y-1">
                  <div>📅 Created: {formatTaskDate(task.createdAt)}</div>
                  {task.assignedAt && <div>👤 Assigned: {formatTaskDate(task.assignedAt)}</div>}
                  {task.startedAt && <div>▶️ Started: {formatTaskDate(task.startedAt)}</div>}
                  {task.completedAt && <div>✅ Completed: {formatTaskDate(task.completedAt)}</div>}
                  {task.actualMinutes && (
                    <div>⏱️ Time spent: {task.actualMinutes} minutes</div>
                  )}
                </div>
              </div>

              {/* Deliverables */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-stone-700">
                    Deliverables ({task.deliverables?.length || 0})
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddDeliverable(!showAddDeliverable)}
                  >
                    {showAddDeliverable ? "Cancel" : "+ Add"}
                  </Button>
                </div>

                {/* Add deliverable form */}
                {showAddDeliverable && (
                  <div className="bg-blue-50 p-3 rounded-lg mb-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Title (e.g., Prospect List)"
                      value={newDeliverableTitle}
                      onChange={(e) => setNewDeliverableTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-stone-200 rounded"
                    />
                    <input
                      type="text"
                      placeholder="URL or file path"
                      value={newDeliverableUrl}
                      onChange={(e) => setNewDeliverableUrl(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-stone-200 rounded"
                    />
                    <div className="flex gap-2">
                      <Select
                        value={newDeliverableType}
                        onValueChange={setNewDeliverableType}
                        options={[
                          { value: "file", label: "📄 File" },
                          { value: "link", label: "🔗 Link" },
                          { value: "sheet", label: "📊 Spreadsheet" },
                          { value: "doc", label: "📝 Document" },
                          { value: "other", label: "📎 Other" },
                        ]}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={handleAddDeliverable}>
                        Add
                      </Button>
                    </div>
                  </div>
                )}

                {/* Deliverables list */}
                <div className="space-y-2">
                  {task.deliverables?.length ? (
                    task.deliverables.map((d: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg group"
                      >
                        <span className="text-lg">{getDeliverableIcon(d.type)}</span>
                        <div className="flex-1 min-w-0">
                          <a
                            href={d.url.startsWith("http") ? d.url : `file://${d.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:underline block truncate"
                          >
                            {d.title}
                          </a>
                          <div className="text-xs text-stone-400 truncate">
                            {d.url}
                          </div>
                          {d.addedBy && (
                            <div className="text-xs text-stone-400">
                              Added by {d.addedBy} • {formatTimeAgo(d.addedAt)}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveDeliverable(d.url)}
                          className="text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-stone-400 text-center py-4 bg-stone-50 rounded-lg">
                      No deliverables yet
                    </div>
                  )}
                </div>
              </div>

              {/* Status change */}
              <div>
                <h3 className="text-sm font-medium text-stone-700 mb-2">Change Status</h3>
                <Select
                  value={task.status}
                  onValueChange={handleStatusChange}
                  options={Object.entries(TASK_STATUS).map(([key, config]) => ({
                    value: key,
                    label: `${config.icon} ${config.label}`,
                  }))}
                />
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="py-4">
              {task.activities?.length ? (
                <div className="space-y-3">
                  {task.activities.map((activity: any) => (
                    <div key={activity._id} className="flex gap-3 text-sm">
                      <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-xs flex-shrink-0">
                        {activity.agentEmoji || "📋"}
                      </div>
                      <div>
                        <p className="text-stone-600">{activity.message}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {activity.agentName && (
                            <span className="text-xs font-medium text-stone-500">
                              {activity.agentName}
                            </span>
                          )}
                          <span className="text-xs text-stone-400">
                            {formatTimeAgo(activity.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-stone-400 text-center py-8">
                  No activity yet
                </div>
              )}
            </div>
          )}

          {activeTab === "comments" && (
            <div className="py-4">
              {/* Add comment */}
              <div className="mb-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg resize-none"
                />
                <div className="flex justify-end mt-2">
                  <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
                    Post Comment
                  </Button>
                </div>
              </div>

              {/* Comments list */}
              {task.comments?.length ? (
                <div className="space-y-4">
                  {task.comments.map((comment: any) => (
                    <div key={comment._id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-sm flex-shrink-0">
                        {comment.agentEmoji || comment.agentName?.[0] || "?"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-stone-700">
                            {comment.agentName || "Unknown"}
                          </span>
                          <span className="text-xs text-stone-400">
                            {formatTimeAgo(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-stone-600 mt-1">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-stone-400 text-center py-8">
                  No comments yet
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
