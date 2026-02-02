"use client";

import { formatTimeAgo } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface Message {
  _id: string;
  content: string;
  createdAt: number;
  agentName?: string;
  agentEmoji?: string;
}

interface MessageListProps {
  messages?: Message[];
  isLoading?: boolean;
  emptyIcon?: string;
  emptyMessage?: string;
}

export function MessageList({ 
  messages, 
  isLoading,
  emptyIcon = "💬",
  emptyMessage = "No messages yet"
}: MessageListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-1" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="text-center text-stone-400 text-sm py-8">
        <div className="text-3xl mb-2">{emptyIcon}</div>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <div key={msg._id} className="flex gap-2 text-sm group">
          <div className="w-7 h-7 bg-stone-100 rounded-full flex items-center justify-center text-sm flex-shrink-0 group-hover:bg-stone-200 transition-colors">
            {msg.agentEmoji || "👤"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-stone-800">
                {msg.agentName || "Unknown"}
              </span>
              <span className="text-xs text-stone-400">
                {formatTimeAgo(msg.createdAt)}
              </span>
            </div>
            <p className="text-stone-600 break-words">{msg.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
