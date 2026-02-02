"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useMemo } from "react";

// Skeleton component for loading states
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-stone-200 rounded ${className}`} />
  );
}

// Loading card for agents
function AgentCardSkeleton() {
  return (
    <div className="p-3 rounded-xl border bg-white border-stone-200">
      <div className="flex items-start gap-3">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-24 mb-2" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  );
}

// Compact agent card for mobile
function AgentCardCompact({ 
  agent, 
  isSelected, 
  onClick 
}: { 
  agent: { _id: string; name: string; emoji: string; status: string; level: string };
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
        isSelected 
          ? "bg-blue-100 border-blue-300 border" 
          : "bg-white border border-stone-200 hover:border-stone-300"
      }`}
    >
      <span className="text-lg">{agent.emoji}</span>
      <span className="text-sm font-medium">{agent.name}</span>
      <span className={`w-2 h-2 rounded-full ${
        agent.status === "working" ? "bg-green-500" :
        agent.status === "idle" ? "bg-stone-300" : "bg-red-400"
      }`} />
    </button>
  );
}

// Loading card for tasks
function TaskCardSkeleton() {
  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-stone-200">
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2 mb-2" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

// Stats counter with loading state
function StatCounter({ 
  value, 
  label, 
  loading,
  className = ""
}: { 
  value: number | undefined; 
  label: string; 
  loading: boolean;
  className?: string;
}) {
  return (
    <div className={`text-center ${className}`}>
      {loading ? (
        <Skeleton className="h-8 w-12 mx-auto mb-1" />
      ) : (
        <div className="text-3xl font-bold text-stone-800">{value ?? 0}</div>
      )}
      <div className="text-xs text-stone-500 uppercase">{label}</div>
    </div>
  );
}

// Mini stat for compact view
function MiniStat({ value, label, icon }: { value: number; label: string; icon: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span>{icon}</span>
      <span className="font-semibold">{value}</span>
      <span className="text-stone-500 hidden sm:inline">{label}</span>
    </div>
  );
}

// Filter pill component
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
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        isActive
          ? "bg-blue-600 text-white"
          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={`ml-1.5 ${isActive ? "text-blue-200" : "text-stone-400"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

export default function Home() {
  const agents = useQuery(api.agents.list);
  const tasks = useQuery(api.tasks.list);
  const activities = useQuery(api.activities.list, { limit: 20 });
  const chatMessages = useQuery(api.messages.listChat, { limit: 30 });
  const sendMessage = useMutation(api.messages.create);
  
  const [chatInput, setChatInput] = useState("");
  const [activeTab, setActiveTab] = useState<"feed" | "chat">("chat");
  const [isSending, setIsSending] = useState(false);
  
  // Filter states
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [mobileView, setMobileView] = useState<"kanban" | "agents" | "chat">("kanban");

  // Derive loading states
  const isAgentsLoading = agents === undefined;
  const isTasksLoading = tasks === undefined;
  const isActivitiesLoading = activities === undefined;
  const isChatLoading = chatMessages === undefined;

  // Calculate connection status
  const isConnected = agents !== undefined || tasks !== undefined;

  // Get unique tags from all tasks
  const allTags = useMemo(() => {
    if (!tasks) return [];
    const tagSet = new Set<string>();
    tasks.forEach(t => t.tags?.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter(task => {
      // Priority filter
      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }
      // Agent filter
      if (agentFilter && !task.assigneeIds.includes(agentFilter as any)) {
        return false;
      }
      return true;
    });
  }, [tasks, priorityFilter, agentFilter]);

  // Memoized task grouping with filters
  const tasksByStatus = useMemo(() => ({
    inbox: filteredTasks.filter((t) => t.status === "inbox"),
    assigned: filteredTasks.filter((t) => t.status === "assigned"),
    in_progress: filteredTasks.filter((t) => t.status === "in_progress"),
    review: filteredTasks.filter((t) => t.status === "review"),
    done: filteredTasks.filter((t) => t.status === "done"),
  }), [filteredTasks]);

  // Count active (working) agents
  const activeAgentsCount = useMemo(() => 
    agents?.filter(a => a.status === "working").length || 0,
    [agents]
  );

  // Check if any filters are active
  const hasActiveFilters = priorityFilter !== "all" || agentFilter !== null;

  const statusLabels: Record<string, string> = {
    inbox: "INBOX",
    assigned: "ASSIGNED",
    in_progress: "IN PROGRESS",
    review: "REVIEW",
    done: "DONE",
  };

  const statusColors: Record<string, string> = {
    inbox: "bg-gray-100",
    assigned: "bg-yellow-50",
    in_progress: "bg-blue-50",
    review: "bg-purple-50",
    done: "bg-green-50",
  };

  const statusIcons: Record<string, string> = {
    inbox: "📥",
    assigned: "👤",
    in_progress: "⚡",
    review: "👁",
    done: "✅",
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSending) return;
    
    setIsSending(true);
    try {
      await sendMessage({
        senderName: "Marcel",
        content: chatInput,
      });
      setChatInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const clearFilters = () => {
    setPriorityFilter("all");
    setAgentFilter(null);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 lg:px-6 py-3 lg:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-3">
            <span className="text-xl lg:text-2xl">◇</span>
            <h1 className="text-lg lg:text-xl font-semibold text-stone-800">MISSION CONTROL</h1>
          </div>
          
          {/* Desktop stats */}
          <div className="hidden md:flex items-center gap-6">
            <StatCounter 
              value={agents?.length} 
              label="Agents" 
              loading={isAgentsLoading} 
            />
            <StatCounter 
              value={activeAgentsCount} 
              label="Working" 
              loading={isAgentsLoading} 
            />
            <StatCounter 
              value={tasks?.length} 
              label="Tasks" 
              loading={isTasksLoading} 
            />
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm transition-colors ${
              isConnected 
                ? "bg-green-100 text-green-700" 
                : "bg-yellow-100 text-yellow-700"
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-yellow-500 animate-pulse"
              }`}></span>
              {isConnected ? "CONNECTED" : "CONNECTING..."}
            </div>
          </div>
          
          {/* Mobile stats */}
          <div className="flex md:hidden items-center gap-3">
            {!isAgentsLoading && !isTasksLoading && (
              <>
                <MiniStat value={agents?.length || 0} label="agents" icon="🤖" />
                <MiniStat value={tasks?.length || 0} label="tasks" icon="📋" />
              </>
            )}
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-yellow-500 animate-pulse"
            }`} />
          </div>
        </div>
        
        {/* Mobile navigation */}
        <div className="flex md:hidden mt-3 gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setMobileView("kanban")}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              mobileView === "kanban" 
                ? "bg-blue-600 text-white" 
                : "bg-stone-100 text-stone-600"
            }`}
          >
            📋 Tasks
          </button>
          <button
            onClick={() => setMobileView("agents")}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              mobileView === "agents" 
                ? "bg-blue-600 text-white" 
                : "bg-stone-100 text-stone-600"
            }`}
          >
            🤖 Agents
          </button>
          <button
            onClick={() => setMobileView("chat")}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              mobileView === "chat" 
                ? "bg-blue-600 text-white" 
                : "bg-stone-100 text-stone-600"
            }`}
          >
            💬 Chat
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Agents (desktop only or mobile when selected) */}
        <aside className={`${
          mobileView === "agents" ? "flex" : "hidden"
        } md:flex w-full md:w-80 bg-white border-r border-stone-200 p-4 min-h-[calc(100vh-73px)] md:min-h-[calc(100vh-73px)] flex-col`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-600 uppercase tracking-wide">Agents</h2>
            {isAgentsLoading ? (
              <Skeleton className="h-5 w-8 rounded-full" />
            ) : (
              <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                {agents?.length || 0}
              </span>
            )}
          </div>
          
          <div className="space-y-3 flex-1 overflow-y-auto">
            {isAgentsLoading ? (
              <>
                <AgentCardSkeleton />
                <AgentCardSkeleton />
                <AgentCardSkeleton />
              </>
            ) : agents && agents.length > 0 ? (
              [...agents]
                .sort((a, b) => {
                  const statusOrder = { working: 0, idle: 1, offline: 2 };
                  return statusOrder[a.status] - statusOrder[b.status];
                })
                .map((agent) => (
                  <div
                    key={agent._id}
                    onClick={() => setAgentFilter(agentFilter === agent._id ? null : agent._id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      agentFilter === agent._id
                        ? "bg-blue-50 border-blue-300 ring-2 ring-blue-200"
                        : agent.status === "working" 
                        ? "bg-green-50 border-green-200 shadow-sm hover:border-green-300" 
                        : agent.status === "offline"
                        ? "bg-stone-50 border-stone-200 opacity-60 hover:opacity-80"
                        : "bg-white border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm ${
                        agentFilter === agent._id
                          ? "bg-gradient-to-br from-blue-100 to-blue-200"
                          : agent.status === "working"
                          ? "bg-gradient-to-br from-green-100 to-green-200"
                          : "bg-gradient-to-br from-stone-100 to-stone-200"
                      }`}>
                        {agent.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-semibold text-stone-800">{agent.name}</span>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            agent.status === "working" ? "bg-green-500 text-white" :
                            agent.status === "idle" ? "bg-stone-200 text-stone-600" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {agent.status === "working" ? "🟢 Working" : 
                             agent.status === "idle" ? "💤 Idle" : "🔴 Offline"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            agent.level === "lead" ? "bg-amber-100 text-amber-700" :
                            agent.level === "specialist" ? "bg-blue-100 text-blue-700" :
                            "bg-stone-100 text-stone-600"
                          }`}>
                            {agent.level === "lead" ? "👑 Lead" : 
                             agent.level === "specialist" ? "⚡ Specialist" : "📚 Intern"}
                          </span>
                        </div>
                        <div className="text-xs text-stone-500 leading-relaxed truncate" title={agent.role}>
                          {agent.role}
                        </div>
                        {agent.lastSeen && (
                          <div className="text-xs text-stone-400 mt-1">
                            Visto: {formatTimeAgo(agent.lastSeen)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center text-stone-400 text-sm py-8">
                <div className="text-3xl mb-2">🤖</div>
                No agents registered
              </div>
            )}
          </div>
        </aside>

        {/* Main Content - Kanban */}
        <main className={`${
          mobileView === "kanban" ? "flex" : "hidden"
        } md:flex flex-1 min-w-0 p-4 lg:p-6 overflow-hidden flex-col`}>
          {/* Filters bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-stone-600 uppercase">Mission Queue</h2>
              {!isTasksLoading && tasks && (
                <div className="text-xs text-stone-400">
                  {hasActiveFilters 
                    ? `${filteredTasks.length} of ${tasks.length} tasks`
                    : `${tasksByStatus.in_progress.length} in progress • ${tasksByStatus.done.length} completed`
                  }
                </div>
              )}
            </div>
            
            {/* Filter pills */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-stone-500 mr-1">Filter:</span>
              <FilterPill 
                label="All" 
                isActive={priorityFilter === "all"} 
                onClick={() => setPriorityFilter("all")}
              />
              <FilterPill 
                label="⚡ High" 
                isActive={priorityFilter === "high"} 
                onClick={() => setPriorityFilter("high")}
                count={tasks?.filter(t => t.priority === "high").length}
              />
              <FilterPill 
                label="Medium" 
                isActive={priorityFilter === "medium"} 
                onClick={() => setPriorityFilter("medium")}
                count={tasks?.filter(t => t.priority === "medium").length}
              />
              <FilterPill 
                label="Low" 
                isActive={priorityFilter === "low"} 
                onClick={() => setPriorityFilter("low")}
                count={tasks?.filter(t => t.priority === "low").length}
              />
              
              {/* Agent filter indicator */}
              {agentFilter && agents && (
                <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-blue-100 rounded-full text-xs">
                  <span className="text-blue-700">
                    👤 {agents.find(a => a._id === agentFilter)?.name}
                  </span>
                  <button 
                    onClick={() => setAgentFilter(null)}
                    className="text-blue-500 hover:text-blue-700 ml-1"
                  >
                    ✕
                  </button>
                </div>
              )}
              
              {/* Clear all filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-stone-500 hover:text-stone-700 ml-2"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
          
          {/* Kanban board */}
          <div className="flex gap-3 lg:gap-4 overflow-x-auto pb-4 pr-4 flex-1">
            {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
              <div key={status} className="flex-shrink-0 w-64 lg:w-72">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">{statusIcons[status]}</span>
                  <span className="text-xs font-semibold text-stone-600 uppercase">
                    {statusLabels[status]}
                  </span>
                  {isTasksLoading ? (
                    <Skeleton className="h-5 w-6 rounded-full" />
                  ) : (
                    <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                      {statusTasks.length}
                    </span>
                  )}
                </div>
                <div className={`${statusColors[status]} rounded-lg p-2 min-h-[200px] max-h-[calc(100vh-280px)] overflow-y-auto space-y-2`}>
                  {isTasksLoading ? (
                    <>
                      <TaskCardSkeleton />
                      <TaskCardSkeleton />
                    </>
                  ) : statusTasks.length > 0 ? (
                    statusTasks.map((task) => (
                      <div
                        key={task._id}
                        className="bg-white rounded-lg p-3 shadow-sm border border-stone-200 hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-medium text-stone-800 text-sm group-hover:text-blue-600 transition-colors line-clamp-2">
                            {task.title}
                          </h3>
                          {task.priority === "high" && (
                            <span className="text-red-500 flex-shrink-0">⚡</span>
                          )}
                        </div>
                        <div className="text-xs text-stone-400 mb-2 flex items-center gap-1">
                          <span>📅</span>
                          <span>
                            {new Date(task.createdAt).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                            })}
                            {" • "}
                            {new Date(task.createdAt).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-xs text-stone-500 mb-2 line-clamp-2">{task.description}</p>
                        )}
                        {/* Assignees */}
                        {task.assigneeIds && task.assigneeIds.length > 0 && (
                          <div className="flex items-center gap-1 mb-2 flex-wrap">
                            {task.assigneeIds.map((assigneeId) => {
                              const assignee = agents?.find((a) => a._id === assigneeId);
                              return assignee ? (
                                <div
                                  key={assigneeId}
                                  className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs"
                                  title={assignee.name}
                                >
                                  <span>{assignee.emoji}</span>
                                  <span className="hidden sm:inline">{assignee.name}</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {task.tags?.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {task.tags && task.tags.length > 3 && (
                            <span className="text-xs text-stone-400">
                              +{task.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-stone-400 text-sm py-8">
                      <div className="text-2xl mb-1 opacity-50">{statusIcons[status]}</div>
                      {hasActiveFilters ? "No matching tasks" : "Empty"}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Right Sidebar - Feed & Chat */}
        <aside className={`${
          mobileView === "chat" ? "flex" : "hidden"
        } md:flex w-full md:w-80 bg-white border-l border-stone-200 flex-col min-h-[calc(100vh-73px)] md:min-h-[calc(100vh-73px)]`}>
          {/* Tabs */}
          <div className="flex border-b border-stone-200">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 px-4 py-3 text-sm font-semibold uppercase transition-colors ${
                activeTab === "chat"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setActiveTab("feed")}
              className={`flex-1 px-4 py-3 text-sm font-semibold uppercase transition-colors ${
                activeTab === "feed"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              📰 Feed
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "feed" ? (
              <div className="space-y-3">
                {isActivitiesLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                      <div className="flex-1">
                        <Skeleton className="h-3 w-full mb-1" />
                        <Skeleton className="h-2 w-16" />
                      </div>
                    </div>
                  ))
                ) : activities && activities.length > 0 ? (
                  activities.map((activity) => (
                    <div key={activity._id} className="flex gap-3 text-sm group">
                      <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-sm flex-shrink-0 group-hover:bg-stone-200 transition-colors">
                        {activity.agentEmoji || "📋"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-stone-700 break-words">{activity.message}</p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {formatTimeAgo(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-stone-400 text-sm py-8">
                    <div className="text-3xl mb-2">📰</div>
                    No activity yet
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {isChatLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-2">
                      <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
                      <div className="flex-1">
                        <Skeleton className="h-3 w-24 mb-1" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))
                ) : chatMessages && chatMessages.length > 0 ? (
                  chatMessages.map((msg) => (
                    <div key={msg._id} className="flex gap-2 text-sm group">
                      <div className="w-7 h-7 bg-stone-100 rounded-full flex items-center justify-center text-sm flex-shrink-0 group-hover:bg-stone-200 transition-colors">
                        {msg.agentEmoji || "🤖"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-stone-800">{msg.agentName}</span>
                          <span className="text-xs text-stone-400">
                            {formatTimeAgo(msg.createdAt)}
                          </span>
                        </div>
                        <p className="text-stone-600 break-words">{msg.content}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-stone-400 text-sm py-8">
                    <div className="text-3xl mb-2">💬</div>
                    Nenhuma mensagem ainda
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chat Input (only in chat tab) */}
          {activeTab === "chat" && (
            <div className="p-3 border-t border-stone-200">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Enviar mensagem..."
                  disabled={isSending}
                  className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-stone-50 disabled:text-stone-400"
                />
                <button
                  type="submit"
                  disabled={isSending || !chatInput.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isSending ? "..." : "Enviar"}
                </button>
              </form>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// Helper function to format time ago
function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d atrás`;
  if (hours > 0) return `${hours}h atrás`;
  if (minutes > 0) return `${minutes}m atrás`;
  return "agora";
}
