"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";
import type { Id } from "../../convex/_generated/dataModel";

interface Notification {
  _id: Id<"notifications">;
  mentionedAgentId: Id<"agents">;
  fromAgentId?: Id<"agents">;
  taskId?: Id<"tasks">;
  content: string;
  delivered: boolean;
  createdAt: number;
  agentName?: string;
  fromAgentName?: string;
  taskTitle?: string;
}

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const notifications = useQuery(api.notifications.getAllUndeliveredWithDetails);
  const markDelivered = useMutation(api.notifications.markDelivered);
  
  const count = notifications?.length || 0;
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const handleMarkDelivered = async (id: Id<"notifications">) => {
    await markDelivered({ id });
  };
  
  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return "agora";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2 rounded-lg transition-colors",
          "hover:bg-stone-100 active:bg-stone-200",
          isOpen && "bg-stone-100"
        )}
        title="Notificações"
      >
        <span className="text-lg">🔔</span>
        
        {/* Badge */}
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center animate-pulse">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-stone-200 overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-700">
                Notificações
              </h3>
              {count > 0 && (
                <span className="text-xs text-stone-500 bg-stone-200 px-2 py-0.5 rounded-full">
                  {count} pendente{count !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          
          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications === undefined ? (
              <div className="p-4 text-center text-stone-400 text-sm">
                Carregando...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <span className="text-3xl block mb-2">🎉</span>
                <p className="text-stone-500 text-sm">
                  Nenhuma notificação pendente
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <NotificationItem
                  key={notif._id}
                  notification={notif as Notification}
                  onMarkDelivered={handleMarkDelivered}
                  formatTime={formatTime}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  onMarkDelivered,
  formatTime,
}: {
  notification: Notification;
  onMarkDelivered: (id: Id<"notifications">) => void;
  formatTime: (timestamp: number) => string;
}) {
  return (
    <div className="px-4 py-3 border-b border-stone-50 hover:bg-stone-50 transition-colors group">
      <div className="flex items-start gap-3">
        {/* Agent indicator */}
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm flex-shrink-0">
          @
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
            <span className="font-medium text-stone-700">
              {notification.agentName || "Agente"}
            </span>
            {notification.fromAgentName && (
              <>
                <span>•</span>
                <span>de {notification.fromAgentName}</span>
              </>
            )}
            <span>•</span>
            <span>{formatTime(notification.createdAt)}</span>
          </div>
          
          <p className="text-sm text-stone-700 line-clamp-2">
            {notification.content}
          </p>
          
          {notification.taskTitle && (
            <p className="text-xs text-blue-600 mt-1 truncate">
              📋 {notification.taskTitle}
            </p>
          )}
        </div>
        
        {/* Dismiss button */}
        <button
          onClick={() => onMarkDelivered(notification._id)}
          className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-stone-600 transition-all"
          title="Marcar como lida"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
