"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Clock } from "@/components/clock";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { NotificationsDropdown } from "@/components/notifications-dropdown";

interface HeaderProps {
  onCreateTask?: () => void;
}

export function Header({ onCreateTask }: HeaderProps) {
  const stats = useQuery(api.agents.getStats);
  const isLoading = stats === undefined;
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);
  const syncFromNotion = useAction(api.sync.syncFromNotion);

  const handleSync = async () => {
    setIsSyncing(true);
    setLastSyncResult(null);
    try {
      const result = await syncFromNotion({});
      if (result.success) {
        setLastSyncResult(`✓ ${result.tasksUpdated} tasks, ${result.agentsUpdated} agents`);
      } else {
        setLastSyncResult(`✗ ${result.errors.join(", ")}`);
      }
      // Clear message after 5 seconds
      setTimeout(() => setLastSyncResult(null), 5000);
    } catch (error: any) {
      setLastSyncResult(`✗ ${error.message}`);
      setTimeout(() => setLastSyncResult(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="bg-white border-b border-stone-200 px-4 md:px-6 py-3 md:py-4">
      <div className="flex items-center justify-between gap-2">
        {/* Logo */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-stone-900 flex items-center justify-center">
            <span className="text-white text-sm md:text-lg">◇</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base md:text-lg font-bold text-stone-800 tracking-tight">
              MISSION CONTROL
            </h1>
          </div>
        </div>

        {/* Center Stats - hidden on very small screens */}
        <div className="hidden sm:flex items-center gap-6 md:gap-12">
          <StatBlock
            value={stats?.activeAgents}
            label="Active"
            isLoading={isLoading}
            highlight
          />
          <StatBlock
            value={stats?.totalTasks}
            label="Tasks"
            isLoading={isLoading}
          />
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Sync Button */}
          <Button
            onClick={handleSync}
            size="sm"
            variant="outline"
            disabled={isSyncing}
            className="hidden md:inline-flex gap-1"
            title="Sincronizar com Notion"
          >
            <span className={cn(isSyncing && "animate-spin")}>🔄</span>
            {isSyncing ? "Syncing..." : "Sync"}
          </Button>
          
          {/* Sync Result Toast */}
          {lastSyncResult && (
            <span className={cn(
              "text-xs px-2 py-1 rounded",
              lastSyncResult.startsWith("✓") 
                ? "bg-green-100 text-green-700" 
                : "bg-red-100 text-red-700"
            )}>
              {lastSyncResult}
            </span>
          )}

          {/* Create Task Button - hidden on mobile (using FAB instead) */}
          {onCreateTask && (
            <Button
              onClick={onCreateTask}
              size="sm"
              className="hidden md:inline-flex"
            >
              + New Task
            </Button>
          )}

          {/* Notifications */}
          <NotificationsDropdown />

          {/* Clock - hidden on mobile */}
          <div className="hidden md:block">
            <Clock />
          </div>

          {/* Status Badge */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full text-xs md:text-sm",
              stats
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 md:w-2 md:h-2 rounded-full",
                stats ? "bg-green-500" : "bg-yellow-500 animate-pulse"
              )}
            />
            <span className="hidden xs:inline">
              {stats ? "ONLINE" : "..."}
            </span>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="text-stone-400 hover:text-stone-600 transition-colors text-sm p-1"
            title="Sair"
          >
            🚪
          </button>
        </div>
      </div>

      {/* Mobile Stats Row */}
      <div className="sm:hidden flex items-center justify-center gap-8 mt-2 pt-2 border-t border-stone-100">
        <StatBlockMini
          value={stats?.activeAgents}
          label="Agents"
          isLoading={isLoading}
        />
        <StatBlockMini
          value={stats?.totalTasks}
          label="Tasks"
          isLoading={isLoading}
        />
        <StatBlockMini
          value={stats?.tasksByStatus?.in_progress}
          label="Active"
          isLoading={isLoading}
        />
      </div>
    </header>
  );
}

function StatBlock({
  value,
  label,
  isLoading,
  highlight,
}: {
  value: number | undefined;
  label: string;
  isLoading: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      {isLoading ? (
        <Skeleton className="h-8 md:h-10 w-12 md:w-16 mx-auto mb-1" />
      ) : (
        <div
          className={cn(
            "text-2xl md:text-4xl font-light tracking-tight",
            highlight ? "text-stone-800" : "text-stone-700"
          )}
        >
          {value ?? 0}
        </div>
      )}
      <div className="text-[9px] md:text-[10px] text-stone-400 uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

function StatBlockMini({
  value,
  label,
  isLoading,
}: {
  value: number | undefined;
  label: string;
  isLoading: boolean;
}) {
  return (
    <div className="text-center">
      {isLoading ? (
        <Skeleton className="h-5 w-8 mx-auto" />
      ) : (
        <div className="text-lg font-semibold text-stone-700">{value ?? 0}</div>
      )}
      <div className="text-[9px] text-stone-400 uppercase">{label}</div>
    </div>
  );
}
