"use client";

import { useQuery } from "convex/react";
import { useRef, useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";
import type { Id } from "../../convex/_generated/dataModel";

interface CommentsListProps {
  taskId: Id<"tasks">;
  className?: string;
  autoScroll?: boolean;
}

export function CommentsList({ taskId, className, autoScroll = true }: CommentsListProps) {
  const messages = useQuery(api.messages.listByTask, { taskId });
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);
  const isNearBottomRef = useRef(true);
  
  // Check if user is near the bottom (within 100px)
  const checkIfNearBottom = () => {
    const container = containerRef.current;
    if (!container) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < 100;
  };
  
  // Update isNearBottom on scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      isNearBottomRef.current = checkIfNearBottom();
    };
    
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);
  
  // Auto-scroll when new messages arrive (only if user was near bottom)
  useEffect(() => {
    if (!messages || !autoScroll) return;
    
    const currentCount = messages.length;
    const hadNewMessages = currentCount > prevCountRef.current;
    
    if (hadNewMessages && isNearBottomRef.current) {
      // Scroll to bottom smoothly
      setTimeout(() => {
        containerRef.current?.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 50);
    }
    
    prevCountRef.current = currentCount;
  }, [messages, autoScroll]);
  
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
    <div 
      ref={containerRef}
      className={cn("space-y-3 overflow-y-auto", className)}
    >
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
