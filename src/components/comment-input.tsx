"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";
import type { Id } from "../../convex/_generated/dataModel";

interface CommentInputProps {
  taskId: Id<"tasks">;
  className?: string;
}

interface Agent {
  _id: Id<"agents">;
  name: string;
  emoji: string;
}

export function CommentInput({ taskId, className }: CommentInputProps) {
  const [value, setValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const agents = useQuery(api.agents.list);
  const createMessage = useMutation(api.messages.create);
  
  // Filter agents based on current mention query
  const getMentionQuery = useCallback(() => {
    if (mentionStart === null) return "";
    return value.slice(mentionStart + 1).toLowerCase();
  }, [mentionStart, value]);
  
  const filteredAgents = agents?.filter((agent: Agent) => {
    const query = getMentionQuery();
    return agent.name.toLowerCase().includes(query);
  }) || [];
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    setValue(newValue);
    
    // Check for @ mentions
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Only show suggestions if there's no space after @
      if (!textAfterAt.includes(" ")) {
        setMentionStart(lastAtIndex);
        setShowSuggestions(true);
        setSuggestionIndex(0);
        return;
      }
    }
    
    setShowSuggestions(false);
    setMentionStart(null);
  };
  
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && filteredAgents.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSuggestionIndex((i) => Math.min(i + 1, filteredAgents.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSuggestionIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Tab" || e.key === "Enter") {
        if (showSuggestions) {
          e.preventDefault();
          insertMention(filteredAgents[suggestionIndex]);
        }
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  // Insert mention at cursor position
  const insertMention = (agent: Agent) => {
    if (mentionStart === null) return;
    
    const before = value.slice(0, mentionStart);
    const cursorPos = inputRef.current?.selectionStart || value.length;
    const after = value.slice(cursorPos);
    
    const newValue = `${before}@${agent.name} ${after}`;
    setValue(newValue);
    setShowSuggestions(false);
    setMentionStart(null);
    
    // Focus and move cursor after mention
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = before.length + agent.name.length + 2;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };
  
  // Submit comment
  const handleSubmit = async () => {
    if (!value.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await createMessage({
        taskId,
        senderName: "Marcel", // TODO: Get from auth
        content: value.trim(),
      });
      setValue("");
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  return (
    <div className={cn("relative", className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <textarea
            ref={inputRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment... (@ to mention)"
            className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={1}
            disabled={isSubmitting}
          />
          
          {/* Mention suggestions dropdown */}
          {showSuggestions && filteredAgents.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute left-0 bottom-full mb-1 w-64 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-50"
            >
              {filteredAgents.map((agent: Agent, index: number) => (
                <button
                  key={agent._id}
                  onClick={() => insertMention(agent)}
                  className={cn(
                    "w-full px-3 py-2 text-left flex items-center gap-2 text-sm transition-colors",
                    index === suggestionIndex
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-stone-50"
                  )}
                >
                  <span className="text-lg">{agent.emoji}</span>
                  <span className="font-medium">{agent.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || isSubmitting}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
            value.trim() && !isSubmitting
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-stone-100 text-stone-400 cursor-not-allowed"
          )}
        >
          {isSubmitting ? "..." : "Post"}
        </button>
      </div>
    </div>
  );
}
