"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { AgentsSidebar } from "@/components/agents-sidebar";
import { KanbanBoard } from "@/components/kanban-board";
import { LiveFeed } from "@/components/live-feed";
import { TaskModal } from "@/components/task-modal";
import { cn } from "@/lib/utils";

type MobileTab = "kanban" | "agents" | "feed";

export default function MissionControl() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("kanban");
  const [showTaskModal, setShowTaskModal] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-stone-50">
      {/* Header */}
      <Header onCreateTask={() => setShowTaskModal(true)} />

      {/* Mobile Tabs - only visible on small screens */}
      <div className="md:hidden flex border-b border-stone-200 bg-white">
        <MobileTabButton
          active={mobileTab === "kanban"}
          onClick={() => setMobileTab("kanban")}
          icon="📋"
          label="Tasks"
        />
        <MobileTabButton
          active={mobileTab === "agents"}
          onClick={() => setMobileTab("agents")}
          icon="🤖"
          label="Agents"
        />
        <MobileTabButton
          active={mobileTab === "feed"}
          onClick={() => setMobileTab("feed")}
          icon="📡"
          label="Feed"
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Agents (hidden on mobile unless tab selected) */}
        <aside
          className={cn(
            "bg-white border-r border-stone-200 flex-shrink-0",
            // Desktop: always visible, fixed width
            "hidden md:block md:w-64 lg:w-72",
            // Mobile: full width when selected
            mobileTab === "agents" && "block w-full md:w-64"
          )}
        >
          <AgentsSidebar
            selectedAgentId={selectedAgentId ?? undefined}
            onAgentSelect={(id) => {
              setSelectedAgentId(id);
              // On mobile, switch to kanban after selecting
              if (window.innerWidth < 768 && id) {
                setMobileTab("kanban");
              }
            }}
          />
        </aside>

        {/* Center - Kanban Board */}
        <main
          className={cn(
            "flex-1 overflow-hidden",
            // Mobile: hidden unless tab selected
            mobileTab !== "kanban" && "hidden md:block"
          )}
        >
          <KanbanBoard
            filterAgentId={selectedAgentId ?? undefined}
            onCreateTask={() => setShowTaskModal(true)}
          />
        </main>

        {/* Right Sidebar - Live Feed (hidden on mobile unless tab selected) */}
        <aside
          className={cn(
            "bg-white border-l border-stone-200 flex-shrink-0",
            // Desktop: always visible, fixed width
            "hidden lg:block lg:w-80",
            // Mobile: full width when selected
            mobileTab === "feed" && "block w-full lg:w-80"
          )}
        >
          <LiveFeed />
        </aside>
      </div>

      {/* Mobile FAB for creating tasks */}
      <button
        onClick={() => setShowTaskModal(true)}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-blue-700 active:scale-95 transition-all z-40"
      >
        +
      </button>

      {/* Task Modal */}
      <TaskModal open={showTaskModal} onOpenChange={setShowTaskModal} />
    </div>
  );
}

function MobileTabButton({
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
        "flex-1 py-3 text-center transition-colors",
        active
          ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
          : "text-stone-500 hover:bg-stone-50"
      )}
    >
      <span className="text-lg">{icon}</span>
      <span className="block text-xs mt-0.5">{label}</span>
    </button>
  );
}
