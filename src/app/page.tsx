"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";

export default function Home() {
  const agents = useQuery(api.agents.list);
  const tasks = useQuery(api.tasks.list);
  const activities = useQuery(api.activities.list, { limit: 20 });
  const chatMessages = useQuery(api.messages.listChat, { limit: 30 });
  const sendMessage = useMutation(api.messages.create);
  
  const [chatInput, setChatInput] = useState("");
  const [activeTab, setActiveTab] = useState<"feed" | "chat">("chat");

  const tasksByStatus = {
    inbox: tasks?.filter((t) => t.status === "inbox") || [],
    assigned: tasks?.filter((t) => t.status === "assigned") || [],
    in_progress: tasks?.filter((t) => t.status === "in_progress") || [],
    review: tasks?.filter((t) => t.status === "review") || [],
    done: tasks?.filter((t) => t.status === "done") || [],
  };

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
            <div className="text-center">
              <div className="text-3xl font-bold text-stone-800">{agents?.length || 0}</div>
              <div className="text-xs text-stone-500 uppercase">Agents Active</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-stone-800">{tasks?.length || 0}</div>
              <div className="text-xs text-stone-500 uppercase">Tasks in Queue</div>
            </div>
            <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              ONLINE
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Agents */}
        <aside className="w-80 bg-white border-r border-stone-200 p-4 min-h-[calc(100vh-73px)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-600 uppercase tracking-wide">Agents</h2>
            <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{agents?.length || 0}</span>
          </div>
          <div className="space-y-3">
            {agents?.map((agent) => (
              <div
                key={agent._id}
                className={`p-3 rounded-xl border transition-all ${
                  agent.status === "working" 
                    ? "bg-green-50 border-green-200 shadow-sm" 
                    : "bg-white border-stone-200 hover:border-stone-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-stone-100 to-stone-200 rounded-xl flex items-center justify-center text-2xl shadow-sm">
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
                         agent.status === "idle" ? "Idle" : "Offline"}
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
                    <div className="text-xs text-stone-500 leading-relaxed">{agent.role}</div>
                  </div>
                </div>
              </div>
            ))}
            {(!agents || agents.length === 0) && (
              <div className="text-center text-stone-400 text-sm py-8">
                No agents registered
              </div>
            )}
          </div>
        </aside>

        {/* Main Content - Kanban */}
        <main className="flex-1 min-w-0 p-6 overflow-hidden">
          <h2 className="text-sm font-semibold text-stone-600 uppercase mb-4">Mission Queue</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 pr-4">
            {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
              <div key={status} className="flex-shrink-0 w-72">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-stone-600 uppercase">
                    {statusLabels[status]}
                  </span>
                  <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                    {statusTasks.length}
                  </span>
                </div>
                <div className={`${statusColors[status]} rounded-lg p-2 min-h-[200px] space-y-2`}>
                  {statusTasks.map((task) => (
                    <div
                      key={task._id}
                      className="bg-white rounded-lg p-3 shadow-sm border border-stone-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-stone-800 text-sm">{task.title}</h3>
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
                        <div className="flex items-center gap-1 mb-2">
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
                  ))}
                  {statusTasks.length === 0 && (
                    <div className="text-center text-stone-400 text-sm py-8">
                      No tasks
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
              className={`flex-1 px-4 py-3 text-sm font-semibold uppercase ${
                activeTab === "chat"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setActiveTab("feed")}
              className={`flex-1 px-4 py-3 text-sm font-semibold uppercase ${
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
                {activities?.map((activity) => (
                  <div key={activity._id} className="flex gap-3 text-sm">
                    <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                      {activity.agentEmoji || "📋"}
                    </div>
                    <div>
                      <p className="text-stone-700">{activity.message}</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {new Date(activity.createdAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                {(!activities || activities.length === 0) && (
                  <div className="text-center text-stone-400 text-sm py-8">
                    No activity yet
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {chatMessages?.map((msg) => (
                  <div key={msg._id} className="flex gap-2 text-sm">
                    <div className="w-7 h-7 bg-stone-100 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                      {msg.agentEmoji || "🤖"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-stone-800">{msg.agentName}</span>
                        <span className="text-xs text-stone-400">
                          {new Date(msg.createdAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-stone-600 break-words">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {(!chatMessages || chatMessages.length === 0) && (
                  <div className="text-center text-stone-400 text-sm py-8">
                    Nenhuma mensagem ainda
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chat Input (only in chat tab) */}
          {activeTab === "chat" && (
            <div className="p-3 border-t border-stone-200">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!chatInput.trim()) return;
                  await sendMessage({
                    senderName: "Marcel", // Humano
                    content: chatInput,
                  });
                  setChatInput("");
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Enviar mensagem..."
                  className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Enviar
                </button>
              </form>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
