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

// Error display component
function ErrorDisplay({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="text-center py-8">
      <div className="text-red-500 mb-2">⚠️ {message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-blue-600 hover:underline"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

// Stats counter with loading state
function StatCounter({ 
  value, 
  label, 
  loading 
}: { 
  value: number | undefined; 
  label: string; 
  loading: boolean;
}) {
  return (
    <div className="text-center">
      {loading ? (
        <Skeleton className="h-8 w-12 mx-auto mb-1" />
      ) : (
        <div className="text-3xl font-bold text-stone-800">{value ?? 0}</div>
      )}
      <div className="text-xs text-stone-500 uppercase">{label}</div>
    </div>
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

  // Derive loading states
  const isAgentsLoading = agents === undefined;
  const isTasksLoading = tasks === undefined;
  const isActivitiesLoading = activities === undefined;
  const isChatLoading = chatMessages === undefined;

  // Calculate connection status
  const isConnected = agents !== undefined || tasks !== undefined;

  // Memoized task grouping
  const tasksByStatus = useMemo(() => ({
    inbox: tasks?.filter((t) => t.status === "inbox") || [],
    assigned: tasks?.filter((t) => t.status === "assigned") || [],
    in_progress: tasks?.filter((t) => t.status === "in_progress") || [],
    review: tasks?.filter((t) => t.status === "review") || [],
    done: tasks?.filter((t) => t.status === "done") || [],
  }), [tasks]);

  // Count active (working) agents
  const activeAgentsCount = useMemo(() => 
    agents?.filter(a => a.status === "working").length || 0,
    [agents]
  );

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

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">◇</span>
            <h1 className="text-xl font-semibold text-stone-800">MISSION CONTROL</h1>
          </div>
          <div className="flex items-center gap-6">
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
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Agents */}
        <aside className="w-80 bg-white border-r border-stone-200 p-4 min-h-[calc(100vh-73px)]">
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
          
          <div className="space-y-3">
            {isAgentsLoading ? (
              // Show skeletons while loading
              <>
                <AgentCardSkeleton />
                <AgentCardSkeleton />
                <AgentCardSkeleton />
              </>
            ) : agents && agents.length > 0 ? (
              // Sort agents: working first, then idle, then offline
              [...agents]
                .sort((a, b) => {
                  const statusOrder = { working: 0, idle: 1, offline: 2 };
                  return statusOrder[a.status] - statusOrder[b.status];
                })
                .map((agent) => (
                  <div
                    key={agent._id}
                    className={`p-3 rounded-xl border transition-all ${
                      agent.status === "working" 
                        ? "bg-green-50 border-green-200 shadow-sm" 
                        : agent.status === "offline"
                        ? "bg-stone-50 border-stone-200 opacity-60"
                        : "bg-white border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm ${
                        agent.status === "working"
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
        <main className="flex-1 min-w-0 p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-600 uppercase">Mission Queue</h2>
            {!isTasksLoading && tasks && tasks.length > 0 && (
              <div className="text-xs text-stone-400">
                {tasksByStatus.in_progress.length} in progress • {tasksByStatus.done.length} completed
              </div>
            )}
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 pr-4">
            {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
              <div key={status} className="flex-shrink-0 w-72">
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
                <div className={`${statusColors[status]} rounded-lg p-2 min-h-[200px] space-y-2`}>
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
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-stone-800 text-sm group-hover:text-blue-600 transition-colors">
                            {task.title}
                          </h3>
                        </div>
                        <div className="text-xs text-stone-400 mb-2 flex items-center gap-1">
                          <span>📅</span>
                          <span>
                            {new Date(task.createdAt).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                            })}
                            {" às "}
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
                                  <span>{assignee.name}</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {task.tags?.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        {task.priority === "high" && (
                          <div className="mt-2 text-xs text-red-600 font-medium">⚡ High Priority</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-stone-400 text-sm py-8">
                      <div className="text-2xl mb-1 opacity-50">{statusIcons[status]}</div>
                      Empty
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Right Sidebar - Feed & Chat */}
        <aside className="w-80 bg-white border-l border-stone-200 flex flex-col min-h-[calc(100vh-73px)]">
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
                  // Loading skeletons for activities
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
                  // Loading skeletons for chat
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
