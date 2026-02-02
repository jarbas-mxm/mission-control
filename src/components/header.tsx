"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Clock } from "@/components/clock";
import { Skeleton } from "@/components/ui/skeleton";

export function Header() {
  const stats = useQuery(api.agents.getStats);
  const isLoading = stats === undefined;
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="bg-white border-b border-stone-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center">
            <span className="text-white text-lg">◇</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-stone-800 tracking-tight">
              MISSION CONTROL
            </h1>
          </div>
        </div>

        {/* Center Stats */}
        <div className="flex items-center gap-12">
          <StatBlock
            value={stats?.activeAgents}
            label="Agents Active"
            isLoading={isLoading}
            highlight
          />
          <StatBlock
            value={stats?.totalTasks}
            label="Tasks in Queue"
            isLoading={isLoading}
          />
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-6">
          <Clock />
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
              stats ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
            )}>
              <span className={cn(
                "w-2 h-2 rounded-full",
                stats ? "bg-green-500" : "bg-yellow-500 animate-pulse"
              )} />
              {stats ? "ONLINE" : "CONNECTING"}
            </div>
          </div>
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="text-stone-400 hover:text-stone-600 transition-colors text-sm"
            title="Sair"
          >
            🚪
          </button>
        </div>
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
        <Skeleton className="h-10 w-16 mx-auto mb-1" />
      ) : (
        <div
          className={cn(
            "text-4xl font-light tracking-tight",
            highlight ? "text-stone-800" : "text-stone-700"
          )}
        >
          {value ?? 0}
        </div>
      )}
      <div className="text-[10px] text-stone-400 uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}
