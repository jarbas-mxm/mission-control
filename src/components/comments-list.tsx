"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";
import type { Id } from "../../convex/_generated/dataModel";

interface CommentsListProps {
  taskId: Id<"tasks">;
  className?: string;
}

export function CommentsList({ taskId, className }: CommentsListProps) {
  const messages = useQuery(api.messages.listByTask, { taskId });
  
  if (messages === undefined) {
    return (
      <div className={cn("py-4 text-center text-stone-400 text-sm", className)}>
        Loading comments...
      </div>
    );
  }
  
  if (messages.length === 0) {
    return (
      <div className={cn("py-4 text-center text-stone-400 text-sm", className)}>
        No comments yet
      </div>
    );
  }
  
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return "agora";
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;
    
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };
  
  // Highlight @mentions in text
  const renderContent = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span key={i} className="text-blue-600 font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };
  
  return (
    <div className={cn("space-y-3", className)}>
      {messages.map((message: any) => (
        <div key={message._id} className="flex gap-3">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-sm flex-shrink-0">
            {message.agentEmoji || "👤"}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-stone-700">
                {message.agentName}
              </span>
              <span className="text-xs text-stone-400">
                {formatTime(message.createdAt)}
              </span>
            </div>
            <p className="text-sm text-stone-600 whitespace-pre-wrap break-words">
              {renderContent(message.content)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
