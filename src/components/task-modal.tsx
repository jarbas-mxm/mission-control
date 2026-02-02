"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { TASK_STATUS, PRIORITY, type TaskStatus, type Priority } from "@/lib/constants";
import type { Id } from "../../convex/_generated/dataModel";

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId?: Id<"tasks">;
  initialStatus?: TaskStatus;
}

export function TaskModal({ open, onOpenChange, taskId, initialStatus = "inbox" }: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<TaskStatus>(initialStatus);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const agents = useQuery(api.agents.list);
  const task = useQuery(api.tasks.get, taskId ? { id: taskId } : "skip");
  const createTask = useMutation(api.tasks.create);
  const updateStatus = useMutation(api.tasks.updateStatus);

  // Load task data when editing
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority((task.priority as Priority) || "medium");
      setStatus(task.status as TaskStatus);
      setTags(task.tags?.join(", ") || "");
      // Note: would need to resolve agent IDs to names for editing
    }
  }, [task]);

  // Reset form when opening for new task
  useEffect(() => {
    if (open && !taskId) {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setStatus(initialStatus);
      setSelectedAgents([]);
      setTags("");
      setError("");
    }
  }, [open, taskId, initialStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (taskId) {
        // Update existing task status
        await updateStatus({ id: taskId, status });
      } else {
        // Create new task
        await createTask({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          assigneeNames: selectedAgents.length > 0 ? selectedAgents : undefined,
          tags: tags.trim() ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
        });
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAgent = (name: string) => {
    setSelectedAgents((prev) =>
      prev.includes(name)
        ? prev.filter((n) => n !== name)
        : [...prev, name]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{taskId ? "Edit Task" : "Create Task"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-md border border-stone-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Task title..."
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-md border border-stone-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Optional description..."
              />
            </div>

            {/* Priority & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Priority
                </label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as Priority)}
                  options={Object.entries(PRIORITY).map(([key, config]) => ({
                    value: key,
                    label: `${config.icon || ""} ${config.label}`.trim(),
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Status
                </label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as TaskStatus)}
                  options={Object.entries(TASK_STATUS).map(([key, config]) => ({
                    value: key,
                    label: `${config.icon} ${config.label}`,
                  }))}
                />
              </div>
            </div>

            {/* Assign Agents */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Assign to
              </label>
              <div className="flex flex-wrap gap-2">
                {agents?.map((agent) => (
                  <button
                    key={agent._id}
                    type="button"
                    onClick={() => toggleAgent(agent.name)}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-full border transition-colors flex items-center gap-1.5",
                      selectedAgents.includes(agent.name)
                        ? "bg-blue-100 border-blue-300 text-blue-700"
                        : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                    )}
                  >
                    <span>{agent.emoji}</span>
                    <span>{agent.name}</span>
                  </button>
                ))}
                {!agents?.length && (
                  <span className="text-sm text-stone-400">No agents available</span>
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Tags
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-md border border-stone-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="tag1, tag2, tag3..."
              />
              <p className="text-xs text-stone-400 mt-1">Separate tags with commas</p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 text-red-600 px-3 py-2 rounded-md text-sm">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : taskId ? "Update" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
