"use client";

import { cn } from "@/lib/utils";
import { formatTimeAgo } from "@/lib/utils";
import { AGENT_STATUS, AGENT_LEVEL, type AgentStatus, type AgentLevel } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";

interface Agent {
  _id: string;
  name: string;
  role: string;
  emoji: string;
  status: AgentStatus;
  level: AgentLevel;
  lastSeen?: number;
}

interface AgentCardProps {
  agent: Agent;
  isSelected?: boolean;
  onClick?: () => void;
}

export function AgentCard({ agent, isSelected, onClick }: AgentCardProps) {
  const status = AGENT_STATUS[agent.status];
  const level = AGENT_LEVEL[agent.level];

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 rounded-xl border transition-all",
        onClick && "cursor-pointer",
        isSelected 
          ? "bg-blue-50 border-blue-300 ring-2 ring-blue-200"
          : status.card,
        !isSelected && agent.status === "working" && "shadow-sm hover:border-green-300",
        !isSelected && agent.status === "idle" && "hover:border-stone-300",
        !isSelected && agent.status === "offline" && "hover:opacity-80"
      )}
    >
      <div className="flex items-start gap-3">
        <div 
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm bg-gradient-to-br",
            isSelected ? "from-blue-100 to-blue-200" : status.avatar
          )}
        >
          {agent.emoji || "🤖"}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-semibold text-stone-800">{agent.name}</span>
            <span className={cn("text-xs px-2 py-1 rounded-full font-medium", status.bg)}>
              {status.icon} {status.label}
            </span>
          </div>
          
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", level.bg)}>
              {level.icon} {level.label}
            </span>
          </div>
          
          <div 
            className="text-xs text-stone-500 leading-relaxed truncate" 
            title={agent.role}
          >
            {agent.role}
          </div>
          
          {agent.lastSeen && (
            <div className="text-xs text-stone-400 mt-1">
              Last seen: {formatTimeAgo(agent.lastSeen)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AgentCardSkeleton() {
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
