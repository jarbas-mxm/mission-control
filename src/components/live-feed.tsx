"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { formatTimeAgo } from "@/lib/utils";
import { ACTIVITY_TABS, type ActivityTab } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";

interface Activity {
  _id: string;
  type: string;
  message: string;
  createdAt: number;
  agentName?: string;
  agentEmoji?: string;
  taskTitle?: string;
}

export function LiveFeed() {
  const [activeTab, setActiveTab] = useState<ActivityTab>("all");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const activities = useQuery(api.activities.list, { limit: 50 });
  const counts = useQuery(api.activities.getCounts);
  const agentCounts = useQuery(api.activities.getAgentActivityCounts);

  const isLoading = activities === undefined;

  // Filter activities
  const filteredActivities = activities?.filter((a) => {
    // Agent filter
    if (selectedAgent && a.agentName !== selectedAgent) return false;

    // Tab filter
    if (activeTab === "all") return true;

    const typeMap: Record<string, string[]> = {
      tasks: ["task_created", "task_assigned", "task_started", "task_completed"],
      comments: ["task_commented", "message_sent"],
      decisions: ["decision_made"],
      docs: ["document_created"],
      status: ["agent_online", "agent_offline", "agent_working", "task_updated", "agent_status_changed"],
    };

    return typeMap[activeTab]?.includes(a.type) ?? false;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <span className="text-red-500">●</span>
          <h2 className="text-sm font-semibold text-stone-700 tracking-wide">
            LIVE FEED
          </h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-3 py-2 border-b border-stone-100 flex flex-wrap gap-1">
        {(Object.keys(ACTIVITY_TABS) as ActivityTab[]).map((tab) => {
          const count = counts?.[tab] || 0;
          const isActive = activeTab === tab;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-2 py-1 text-xs rounded transition-colors",
                isActive
                  ? "bg-stone-800 text-white"
                  : "text-stone-500 hover:bg-stone-100"
              )}
            >
              {ACTIVITY_TABS[tab].label}
              {count > 0 && (
                <span
                  className={cn(
                    "ml-1",
                    isActive ? "text-stone-300" : "text-stone-400"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Agent Filter */}
      <div className="px-3 py-2 border-b border-stone-100">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setSelectedAgent(null)}
            className={cn(
              "px-2 py-1 text-xs rounded-full transition-colors",
              !selectedAgent
                ? "bg-stone-800 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            )}
          >
            All Agents
          </button>
          {agentCounts?.slice(0, 6).map((agent) => (
            <button
              key={agent.name}
              onClick={() =>
                setSelectedAgent(
                  selectedAgent === agent.name ? null : agent.name
                )
              }
              className={cn(
                "px-2 py-1 text-xs rounded-full transition-colors flex items-center gap-1",
                selectedAgent === agent.name
                  ? "bg-stone-800 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              )}
            >
              <span>{agent.emoji}</span>
              <span>{agent.name}</span>
              <span className="text-stone-400">{agent.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredActivities && filteredActivities.length > 0 ? (
          <div className="divide-y divide-stone-100">
            {filteredActivities.map((activity) => (
              <ActivityItem key={activity._id} activity={activity} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-stone-400 text-sm">
            No activity yet
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  // Format message to highlight task titles
  const formattedMessage = activity.message.replace(
    /"([^"]+)"/g,
    '<span class="font-medium text-stone-700">"$1"</span>'
  );

  return (
    <div className="px-4 py-3 hover:bg-stone-50 transition-colors group">
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-sm flex-shrink-0">
          {activity.agentEmoji || "📋"}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm text-stone-600 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formattedMessage }}
          />
          <div className="flex items-center gap-2 mt-1">
            {activity.agentName && (
              <span className="text-xs font-medium text-stone-500">
                {activity.agentName}
              </span>
            )}
            <span className="text-xs text-stone-400">
              {formatTimeAgo(activity.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
