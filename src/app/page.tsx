"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { AgentsSidebar } from "@/components/agents-sidebar";
import { KanbanBoard } from "@/components/kanban-board";
import { LiveFeed } from "@/components/live-feed";

export default function MissionControl() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  return (
    <div className="h-screen flex flex-col bg-stone-50">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Agents */}
        <aside className="w-72 bg-white border-r border-stone-200 flex-shrink-0">
          <AgentsSidebar
            selectedAgentId={selectedAgentId ?? undefined}
            onAgentSelect={setSelectedAgentId}
          />
        </aside>

        {/* Center - Kanban Board */}
        <main className="flex-1 overflow-hidden">
          <KanbanBoard filterAgentId={selectedAgentId ?? undefined} />
        </main>

        {/* Right Sidebar - Live Feed */}
        <aside className="w-80 bg-white border-l border-stone-200 flex-shrink-0">
          <LiveFeed />
        </aside>
      </div>
    </div>
  );
}
