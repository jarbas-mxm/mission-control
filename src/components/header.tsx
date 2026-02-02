"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatProps {
  value: number | undefined;
  label: string;
  isLoading: boolean;
}

function Stat({ value, label, isLoading }: StatProps) {
  return (
    <div className="text-center">
      {isLoading ? (
        <Skeleton className="h-8 w-12 mx-auto mb-1" />
      ) : (
        <div className="text-3xl font-bold text-stone-800">{value ?? 0}</div>
      )}
      <div className="text-xs text-stone-500 uppercase">{label}</div>
    </div>
  );
}

interface HeaderProps {
  agentCount?: number;
  workingCount?: number;
  taskCount?: number;
  isLoading: boolean;
  isConnected: boolean;
  mobileView: "kanban" | "agents" | "chat";
  onMobileViewChange: (view: "kanban" | "agents" | "chat") => void;
}

export function Header({
  agentCount,
  workingCount,
  taskCount,
  isLoading,
  isConnected,
  mobileView,
  onMobileViewChange,
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-stone-200 px-4 lg:px-6 py-3 lg:py-4">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 lg:gap-3">
          <span className="text-xl lg:text-2xl">◇</span>
          <h1 className="text-lg lg:text-xl font-semibold text-stone-800">
            MISSION CONTROL
          </h1>
        </div>

        {/* Desktop stats */}
        <div className="hidden md:flex items-center gap-6">
          <Stat value={agentCount} label="Agents" isLoading={isLoading} />
          <Stat value={workingCount} label="Working" isLoading={isLoading} />
          <Stat value={taskCount} label="Tasks" isLoading={isLoading} />
          <ConnectionStatus isConnected={isConnected} />
        </div>

        {/* Mobile stats */}
        <div className="flex md:hidden items-center gap-3">
          {!isLoading && (
            <>
              <MiniStat value={agentCount || 0} icon="🤖" />
              <MiniStat value={taskCount || 0} icon="📋" />
            </>
          )}
          <div 
            className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500" : "bg-yellow-500 animate-pulse"
            )} 
          />
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="flex md:hidden mt-3 gap-2 overflow-x-auto pb-1">
        <MobileNavButton
          active={mobileView === "kanban"}
          onClick={() => onMobileViewChange("kanban")}
          icon="📋"
          label="Tasks"
        />
        <MobileNavButton
          active={mobileView === "agents"}
          onClick={() => onMobileViewChange("agents")}
          icon="🤖"
          label="Agents"
        />
        <MobileNavButton
          active={mobileView === "chat"}
          onClick={() => onMobileViewChange("chat")}
          icon="💬"
          label="Chat"
        />
      </div>
    </header>
  );
}

function ConnectionStatus({ isConnected }: { isConnected: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1 rounded-full text-sm transition-colors",
        isConnected 
          ? "bg-green-100 text-green-700" 
          : "bg-yellow-100 text-yellow-700"
      )}
    >
      <span
        className={cn(
          "w-2 h-2 rounded-full",
          isConnected ? "bg-green-500" : "bg-yellow-500 animate-pulse"
        )}
      />
      {isConnected ? "CONNECTED" : "CONNECTING..."}
    </div>
  );
}

function MiniStat({ value, icon }: { value: number; icon: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span>{icon}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function MobileNavButton({
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
        "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap",
        active ? "bg-blue-600 text-white" : "bg-stone-100 text-stone-600"
      )}
    >
      {icon} {label}
    </button>
  );
}
