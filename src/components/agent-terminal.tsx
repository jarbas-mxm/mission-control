"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";
import type { Id } from "../../convex/_generated/dataModel";

interface AgentTerminalProps {
  agentId: Id<"agents">;
  agentName?: string;
}

export function AgentTerminal({ agentId, agentName }: AgentTerminalProps) {
  const logs = useQuery(api.terminalLogs.getByAgent, { agentId, limit: 100 });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll ao receber novos logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const isIdle = !logs || logs.length === 0;

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 font-mono text-xs">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-zinc-400 text-xs ml-2">
            {agentName || "Agent"} Terminal
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              isIdle ? "bg-zinc-600" : "bg-green-500 animate-pulse"
            )}
          />
          <span className="text-zinc-500 text-[10px]">
            {isIdle ? "IDLE" : "ACTIVE"}
          </span>
        </div>
      </div>

      {/* Terminal Body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900"
      >
        {isIdle ? (
          <div className="text-zinc-600 italic">
            <div>~ Waiting for activity...</div>
            <div className="mt-2 animate-pulse">▋</div>
          </div>
        ) : (
          logs?.map((log, idx) => (
            <TerminalLine
              key={log._id}
              timestamp={log.createdAt}
              level={log.level}
              message={log.message}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TerminalLine({
  timestamp,
  level,
  message,
}: {
  timestamp: number;
  level: "info" | "success" | "warning" | "error" | "system";
  message: string;
}) {
  const time = new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const levelConfig = {
    info: { icon: "ℹ", color: "text-blue-400" },
    success: { icon: "✓", color: "text-green-400" },
    warning: { icon: "⚠", color: "text-yellow-400" },
    error: { icon: "✗", color: "text-red-400" },
    system: { icon: "◆", color: "text-purple-400" },
  };

  const config = levelConfig[level];

  return (
    <div className="flex gap-2 hover:bg-zinc-900/50 px-1 -mx-1 rounded">
      <span className="text-zinc-600 flex-shrink-0">[{time}]</span>
      <span className={cn("flex-shrink-0", config.color)}>{config.icon}</span>
      <span className="text-zinc-300 break-words">{message}</span>
    </div>
  );
}
