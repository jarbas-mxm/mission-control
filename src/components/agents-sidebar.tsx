"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { AGENT_STATUS, AGENT_LEVEL } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";

interface Agent {
  _id: string;
  name: string;
  role: string;
  emoji: string;
  avatar?: string;
  status: "working" | "idle" | "offline";
  level: "lead" | "specialist" | "intern";
  currentTaskId?: string;
  tasksCompleted?: number;
}

interface AgentsSidebarProps {
  selectedAgentId?: string;
  onAgentSelect?: (agentId: string | null) => void;
}

export function AgentsSidebar({
  selectedAgentId,
  onAgentSelect,
}: AgentsSidebarProps) {
  const agents = useQuery(api.agents.list);
  const isLoading = agents === undefined;

  // Sort: working first, then by level (lead > specialist > intern)
  const sortedAgents = agents
    ? [...agents].sort((a, b) => {
        const statusOrder = { working: 0, idle: 1, offline: 2 };
        const levelOrder = { lead: 0, specialist: 1, intern: 2 };

        const statusDiff = statusOrder[a.status] - statusOrder[b.status];
        if (statusDiff !== 0) return statusDiff;

        return levelOrder[a.level] - levelOrder[b.level];
      })
    : [];

  const activeCount =
    agents?.filter((a) => a.status !== "offline").length || 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 md:px-4 py-2 md:py-3 border-b border-stone-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xs md:text-sm font-semibold text-stone-700 tracking-wide">
            AGENTS
          </h2>
          <span className="text-[10px] md:text-xs text-stone-400 bg-stone-100 px-1.5 md:px-2 py-0.5 rounded-full">
            {activeCount} active
          </span>
        </div>
      </div>

      {/* Clear Filter Button */}
      {selectedAgentId && (
        <div className="px-3 md:px-4 py-2 border-b border-stone-100">
          <button
            onClick={() => onAgentSelect?.(null)}
            className="w-full text-xs text-blue-600 hover:text-blue-700 py-1 hover:bg-blue-50 rounded transition-colors"
          >
            ✕ Clear filter
          </button>
        </div>
      )}

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-2 md:p-3 space-y-1 md:space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <AgentSkeleton key={i} />
            ))}
          </div>
        ) : sortedAgents.length > 0 ? (
          <div className="py-1 md:py-2">
            {sortedAgents.map((agent) => (
              <AgentRow
                key={agent._id}
                agent={agent as Agent}
                isSelected={selectedAgentId === agent._id}
                onSelect={() =>
                  onAgentSelect?.(
                    selectedAgentId === agent._id ? null : agent._id
                  )
                }
              />
            ))}
          </div>
        ) : (
          <div className="p-6 md:p-8 text-center text-stone-400 text-xs md:text-sm">
            No agents registered
          </div>
        )}
      </div>
    </div>
  );
}

function AgentRow({
  agent,
  isSelected,
  onSelect,
}: {
  agent: Agent;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const status = AGENT_STATUS[agent.status];
  const level = AGENT_LEVEL[agent.level];

  return (
    <div
      onClick={onSelect}
      className={cn(
        "px-3 md:px-4 py-2 md:py-2.5 flex items-center gap-2 md:gap-3 cursor-pointer transition-colors",
        "hover:bg-stone-50 active:bg-stone-100",
        isSelected && "bg-blue-50 border-l-2 border-blue-500"
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className={cn(
            "w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-lg md:text-xl",
            "bg-gradient-to-br from-stone-100 to-stone-200",
            agent.status === "working" && "from-green-100 to-green-200"
          )}
        >
          {agent.emoji || agent.name[0]}
        </div>
        {/* Status dot */}
        <div
          className={cn(
            "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 md:w-3 md:h-3 rounded-full border-2 border-white",
            status.dot
          )}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 md:gap-2">
          <span className="font-medium text-stone-800 text-xs md:text-sm truncate">
            {agent.name}
          </span>
          {/* Level badge */}
          <span
            className={cn(
              "text-[8px] md:text-[10px] font-bold px-1 md:px-1.5 py-0.5 rounded flex-shrink-0",
              level.bg,
              level.text
            )}
          >
            {level.label}
          </span>
        </div>
        <div className="text-[10px] md:text-xs text-stone-500 truncate">
          {agent.role}
        </div>
      </div>

      {/* Status */}
      {agent.status === "working" && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full animate-pulse",
              status.dot
            )}
          />
          <span className={cn("text-[9px] md:text-[10px] font-bold", status.text)}>
            {status.label}
          </span>
        </div>
      )}
    </div>
  );
}

function AgentSkeleton() {
  return (
    <div className="px-3 md:px-4 py-2 md:py-2.5 flex items-center gap-2 md:gap-3">
      <Skeleton className="w-9 h-9 md:w-10 md:h-10 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-3 md:h-4 w-20 md:w-24 mb-1" />
        <Skeleton className="h-2.5 md:h-3 w-28 md:w-32" />
      </div>
    </div>
  );
}
