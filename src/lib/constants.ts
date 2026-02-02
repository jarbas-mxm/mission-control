// Task status configuration
export const TASK_STATUS = {
  inbox: {
    label: "Inbox",
    icon: "📥",
    color: "bg-stone-50",
    headerColor: "text-stone-600",
  },
  assigned: {
    label: "Assigned",
    icon: "👤",
    color: "bg-amber-50",
    headerColor: "text-amber-600",
  },
  in_progress: {
    label: "In Progress",
    icon: "⚡",
    color: "bg-blue-50",
    headerColor: "text-blue-600",
  },
  review: {
    label: "Review",
    icon: "👁",
    color: "bg-purple-50",
    headerColor: "text-purple-600",
  },
  done: {
    label: "Done",
    icon: "✅",
    color: "bg-green-50",
    headerColor: "text-green-600",
  },
  blocked: {
    label: "Blocked",
    icon: "🚫",
    color: "bg-red-50",
    headerColor: "text-red-600",
  },
} as const;

// Agent status configuration
export const AGENT_STATUS = {
  working: {
    label: "WORKING",
    icon: "🟢",
    dot: "bg-green-500",
    text: "text-green-600",
    bg: "bg-green-50",
    card: "bg-green-50 border-green-200",
    avatar: "from-green-100 to-green-200",
  },
  idle: {
    label: "IDLE",
    icon: "💤",
    dot: "bg-stone-400",
    text: "text-stone-500",
    bg: "bg-stone-50",
    card: "bg-white border-stone-200",
    avatar: "from-stone-100 to-stone-200",
  },
  offline: {
    label: "OFFLINE",
    icon: "🔴",
    dot: "bg-red-400",
    text: "text-red-500",
    bg: "bg-red-50",
    card: "bg-stone-50 border-stone-200 opacity-60",
    avatar: "from-stone-100 to-stone-200",
  },
} as const;

// Agent level badges
export const AGENT_LEVEL = {
  lead: {
    label: "LEAD",
    icon: "👑",
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  specialist: {
    label: "SPC",
    icon: "⚡",
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  intern: {
    label: "INT",
    icon: "📚",
    bg: "bg-stone-100",
    text: "text-stone-600",
    border: "border-stone-200",
  },
} as const;

// Activity types for Live Feed tabs
export const ACTIVITY_TABS = {
  all: { label: "All", icon: "" },
  tasks: { label: "Tasks", icon: "📋" },
  comments: { label: "Comments", icon: "💬" },
  decisions: { label: "Decisions", icon: "⚖️" },
  docs: { label: "Docs", icon: "📄" },
  status: { label: "Status", icon: "🔄" },
} as const;

// Priority configuration
export const PRIORITY = {
  high: {
    label: "High",
    icon: "⚡",
    color: "text-red-600",
    bg: "bg-red-50",
  },
  medium: {
    label: "Medium",
    icon: "",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  low: {
    label: "Low",
    icon: "",
    color: "text-stone-500",
    bg: "bg-stone-50",
  },
} as const;

// Tag colors (cycle through these)
export const TAG_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
  "bg-amber-100 text-amber-700",
  "bg-cyan-100 text-cyan-700",
  "bg-rose-100 text-rose-700",
  "bg-indigo-100 text-indigo-700",
] as const;

// Type exports
export type TaskStatus = keyof typeof TASK_STATUS;
export type AgentStatus = keyof typeof AGENT_STATUS;
export type AgentLevel = keyof typeof AGENT_LEVEL;
export type Priority = keyof typeof PRIORITY;
export type ActivityTab = keyof typeof ACTIVITY_TABS;
