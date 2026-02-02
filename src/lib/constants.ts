// Status configuration - single source of truth
export const TASK_STATUS = {
  inbox: {
    label: "Inbox",
    icon: "📥",
    color: "bg-gray-100",
  },
  assigned: {
    label: "Assigned",
    icon: "👤",
    color: "bg-yellow-50",
  },
  in_progress: {
    label: "In Progress",
    icon: "⚡",
    color: "bg-blue-50",
  },
  review: {
    label: "Review",
    icon: "👁",
    color: "bg-purple-50",
  },
  done: {
    label: "Done",
    icon: "✅",
    color: "bg-green-50",
  },
  blocked: {
    label: "Blocked",
    icon: "🚫",
    color: "bg-red-50",
  },
} as const;

export const AGENT_STATUS = {
  working: {
    label: "Working",
    icon: "🟢",
    bg: "bg-green-500 text-white",
    card: "bg-green-50 border-green-200",
    avatar: "from-green-100 to-green-200",
  },
  idle: {
    label: "Idle",
    icon: "💤",
    bg: "bg-stone-200 text-stone-600",
    card: "bg-white border-stone-200",
    avatar: "from-stone-100 to-stone-200",
  },
  offline: {
    label: "Offline",
    icon: "🔴",
    bg: "bg-red-100 text-red-700",
    card: "bg-stone-50 border-stone-200 opacity-60",
    avatar: "from-stone-100 to-stone-200",
  },
} as const;

export const AGENT_LEVEL = {
  lead: {
    label: "Lead",
    icon: "👑",
    bg: "bg-amber-100 text-amber-700",
  },
  specialist: {
    label: "Specialist",
    icon: "⚡",
    bg: "bg-blue-100 text-blue-700",
  },
  intern: {
    label: "Intern",
    icon: "📚",
    bg: "bg-stone-100 text-stone-600",
  },
} as const;

export const PRIORITY = {
  high: { label: "High", icon: "⚡" },
  medium: { label: "Medium", icon: "" },
  low: { label: "Low", icon: "" },
} as const;

// Type exports
export type TaskStatus = keyof typeof TASK_STATUS;
export type AgentStatus = keyof typeof AGENT_STATUS;
export type AgentLevel = keyof typeof AGENT_LEVEL;
export type Priority = keyof typeof PRIORITY;
