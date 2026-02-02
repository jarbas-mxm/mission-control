"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useMemo, useCallback } from "react";

import { cn } from "@/lib/utils";
import { sortAgentsByStatus } from "@/lib/utils";
import { TASK_STATUS, type TaskStatus } from "@/lib/constants";

import { Header } from "@/components/header";
import { AgentCard, AgentCardSkeleton } from "@/components/agent-card";
import { KanbanColumn } from "@/components/kanban-column";
import { TaskFilters } from "@/components/task-filters";
import { MessageList } from "@/components/message-list";
import { ActivityFeed } from "@/components/activity-feed";
import { MetricsDashboard, MetricsCompact } from "@/components/metrics-dashboard";

type Priority = "all" | "high" | "medium" | "low";
type MobileView = "kanban" | "agents" | "chat";
type SidebarTab = "chat" | "feed" | "metrics";

export default function MissionControl() {
  // Data
  const agents = useQuery(api.agents.list);
  const tasks = useQuery(api.tasks.list);
  const activities = useQuery(api.activities.list, { limit: 20 });
  const chatMessages = useQuery(api.messages.listChat, { limit: 30 });
  const sendMessage = useMutation(api.messages.create);

  // UI State
  const [mobileView, setMobileView] = useState<MobileView>("kanban");
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("chat");
  const [priorityFilter, setPriorityFilter] = useState<Priority>("all");
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Derived state
  const isLoading = agents === undefined || tasks === undefined;
  const isConnected = agents !== undefined || tasks !== undefined;
  const workingCount = agents?.filter(a => a.status === "working").length ?? 0;

  // Filter and group tasks
  const { filteredTasks, tasksByStatus, taskCounts } = useMemo(() => {
    const emptyByStatus: Record<TaskStatus, any[]> = {
      inbox: [],
      assigned: [],
      in_progress: [],
      review: [],
      done: [],
      blocked: [],
    };

    if (!tasks) {
      return {
        filteredTasks: [],
        tasksByStatus: emptyByStatus,
        taskCounts: { total: 0, high: 0, medium: 0, low: 0 },
      };
    }

    const filtered = tasks.filter(task => {
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (agentFilter && !task.assigneeIds.includes(agentFilter as any)) return false;
      return true;
    });

    const byStatus: Record<TaskStatus, typeof filtered> = {
      inbox: filtered.filter(t => t.status === "inbox"),
      assigned: filtered.filter(t => t.status === "assigned"),
      in_progress: filtered.filter(t => t.status === "in_progress"),
      review: filtered.filter(t => t.status === "review"),
      done: filtered.filter(t => t.status === "done"),
      blocked: filtered.filter(t => t.status === "blocked"),
    };

    return {
      filteredTasks: filtered,
      tasksByStatus: byStatus,
      taskCounts: {
        total: tasks.length,
        high: tasks.filter(t => t.priority === "high").length,
        medium: tasks.filter(t => t.priority === "medium").length,
        low: tasks.filter(t => t.priority === "low").length,
      },
    };
  }, [tasks, priorityFilter, agentFilter]);

  // Get agent filter info for display
  const agentFilterInfo = useMemo(() => {
    if (!agentFilter || !agents) return null;
    const agent = agents.find(a => a._id === agentFilter);
    return agent ? { id: agent._id, name: agent.name } : null;
  }, [agentFilter, agents]);

  // Handlers
  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const message = chatInput.trim();
    if (!message || isSending) return;

    setIsSending(true);
    try {
      await sendMessage({ senderName: "Marcel", content: message });
      setChatInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  }, [chatInput, isSending, sendMessage]);

  const toggleAgentFilter = useCallback((agentId: string) => {
    setAgentFilter(current => current === agentId ? null : agentId);
  }, []);

  const hasActiveFilters = priorityFilter !== "all" || agentFilter !== null;
  const filterSummary = hasActiveFilters
    ? `${filteredTasks.length} of ${taskCounts.total} tasks`
    : `${tasksByStatus.in_progress?.length ?? 0} in progress • ${tasksByStatus.done?.length ?? 0} completed`;

  return (
    <div className="min-h-screen bg-stone-50">
      <Header
        agentCount={agents?.length}
        workingCount={workingCount}
        taskCount={tasks?.length}
        isLoading={isLoading}
        isConnected={isConnected}
        mobileView={mobileView}
        onMobileViewChange={setMobileView}
      />

      <div className="flex">
        {/* Agents Sidebar */}
        <aside
          className={cn(
            "w-full md:w-80 bg-white border-r border-stone-200 p-4 flex-col",
            "min-h-[calc(100vh-73px)]",
            mobileView === "agents" ? "flex" : "hidden md:flex"
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-600 uppercase tracking-wide">
              Agents
            </h2>
            <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
              {agents?.length ?? 0}
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {!agents ? (
              <>
                <AgentCardSkeleton />
                <AgentCardSkeleton />
                <AgentCardSkeleton />
              </>
            ) : agents.length > 0 ? (
              sortAgentsByStatus(agents).map(agent => (
                <AgentCard
                  key={agent._id}
                  agent={agent as any}
                  isSelected={agentFilter === agent._id}
                  onClick={() => toggleAgentFilter(agent._id)}
                />
              ))
            ) : (
              <div className="text-center text-stone-400 text-sm py-8">
                <div className="text-3xl mb-2">🤖</div>
                No agents registered
              </div>
            )}
          </div>
        </aside>

        {/* Kanban Main Area */}
        <main
          className={cn(
            "flex-1 min-w-0 p-4 lg:p-6 flex-col overflow-hidden",
            mobileView === "kanban" ? "flex" : "hidden md:flex"
          )}
        >
          {/* Filters */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-stone-600 uppercase">
                Mission Queue
              </h2>
              {!isLoading && (
                <div className="text-xs text-stone-400">{filterSummary}</div>
              )}
            </div>

            <TaskFilters
              priority={priorityFilter}
              onPriorityChange={setPriorityFilter}
              agentFilter={agentFilterInfo}
              onAgentFilterClear={() => setAgentFilter(null)}
              taskCounts={taskCounts}
            />
          </div>

          {/* Kanban Board */}
          <div className="flex gap-3 lg:gap-4 overflow-x-auto pb-4 pr-4 flex-1">
            {(Object.keys(TASK_STATUS) as TaskStatus[]).map(status => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={tasksByStatus[status] ?? []}
                agents={agents}
                isLoading={!tasks}
                emptyMessage={hasActiveFilters ? "No matching tasks" : "Empty"}
              />
            ))}
          </div>
        </main>

        {/* Chat/Feed Sidebar */}
        <aside
          className={cn(
            "w-full md:w-80 bg-white border-l border-stone-200 flex-col",
            "min-h-[calc(100vh-73px)]",
            mobileView === "chat" ? "flex" : "hidden md:flex"
          )}
        >
          {/* Tabs */}
          <div className="flex border-b border-stone-200">
            <TabButton
              active={sidebarTab === "chat"}
              onClick={() => setSidebarTab("chat")}
              icon="💬"
              label="Chat"
            />
            <TabButton
              active={sidebarTab === "feed"}
              onClick={() => setSidebarTab("feed")}
              icon="📰"
              label="Feed"
            />
            <TabButton
              active={sidebarTab === "metrics"}
              onClick={() => setSidebarTab("metrics")}
              icon="📊"
              label="Stats"
            />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {sidebarTab === "metrics" ? (
              <MetricsDashboard />
            ) : sidebarTab === "feed" ? (
              <ActivityFeed
                activities={activities}
                isLoading={activities === undefined}
              />
            ) : (
              <MessageList
                messages={chatMessages}
                isLoading={chatMessages === undefined}
                emptyIcon="💬"
                emptyMessage="No messages yet"
              />
            )}
          </div>

          {/* Chat Input */}
          {sidebarTab === "chat" && (
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-stone-200 flex gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Send a message..."
                disabled={isSending}
                className={cn(
                  "flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500",
                  "disabled:bg-stone-50 disabled:text-stone-400"
                )}
              />
              <button
                type="submit"
                disabled={isSending || !chatInput.trim()}
                className={cn(
                  "px-3 py-2 bg-blue-600 text-white rounded-lg text-sm",
                  "hover:bg-blue-700 transition-colors",
                  "disabled:bg-blue-300 disabled:cursor-not-allowed"
                )}
              >
                {isSending ? "..." : "Send"}
              </button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 px-4 py-3 text-sm font-semibold uppercase transition-colors",
        active
          ? "text-blue-600 border-b-2 border-blue-600"
          : "text-stone-500 hover:text-stone-700"
      )}
    >
      {icon} {label}
    </button>
  );
}
