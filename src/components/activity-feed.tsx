"use client";

import { formatTimeAgo } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface Activity {
  _id: string;
  message: string;
  createdAt: number;
  agentEmoji?: string;
}

interface ActivityFeedProps {
  activities?: Activity[];
  isLoading?: boolean;
}

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-3 w-full mb-1" />
              <Skeleton className="h-2 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center text-stone-400 text-sm py-8">
        <div className="text-3xl mb-2">📰</div>
        No activity yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity._id} className="flex gap-3 text-sm group">
          <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-sm flex-shrink-0 group-hover:bg-stone-200 transition-colors">
            {activity.agentEmoji || "📋"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-stone-700 break-words">{activity.message}</p>
            <p className="text-xs text-stone-400 mt-0.5">
              {formatTimeAgo(activity.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
