import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Agentes (Apollo, Zaion, etc)
  agents: defineTable({
    name: v.string(),
    role: v.string(),
    emoji: v.string(),
    status: v.union(v.literal("idle"), v.literal("working"), v.literal("offline")),
    level: v.union(v.literal("lead"), v.literal("specialist"), v.literal("intern")),
    sessionKey: v.optional(v.string()),
    currentTaskId: v.optional(v.id("tasks")),
    lastSeen: v.optional(v.number()),
  }).index("by_name", ["name"]),

  // Tasks do Kanban
  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done"),
      v.literal("blocked")
    ),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    assigneeIds: v.array(v.id("agents")),
    tags: v.optional(v.array(v.string())),
    createdBy: v.optional(v.id("agents")),
    createdAt: v.number(),
    updatedAt: v.number(),
    startDate: v.optional(v.number()),
    dueDate: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_assignee", ["assigneeIds"]),

  // Mensagens/Comentários nas tasks
  messages: defineTable({
    taskId: v.optional(v.id("tasks")), // opcional para chat geral
    agentId: v.optional(v.id("agents")), // opcional para humanos
    senderName: v.optional(v.string()), // nome do humano (Marcel, etc)
    content: v.string(),
    attachments: v.optional(v.array(v.string())),
    createdAt: v.number(),
  }).index("by_task", ["taskId"]),

  // Feed de atividades
  activities: defineTable({
    type: v.union(
      v.literal("task_created"),
      v.literal("task_updated"),
      v.literal("task_completed"),
      v.literal("message_sent"),
      v.literal("agent_status_changed"),
      v.literal("document_created")
    ),
    agentId: v.optional(v.id("agents")),
    taskId: v.optional(v.id("tasks")),
    message: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),

  // Documentos/Entregas
  documents: defineTable({
    title: v.string(),
    content: v.string(),
    type: v.union(
      v.literal("deliverable"),
      v.literal("research"),
      v.literal("report"),
      v.literal("protocol")
    ),
    taskId: v.optional(v.id("tasks")),
    agentId: v.id("agents"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_task", ["taskId"]),

  // Notificações (@mentions)
  notifications: defineTable({
    mentionedAgentId: v.id("agents"),
    fromAgentId: v.optional(v.id("agents")),
    taskId: v.optional(v.id("tasks")),
    content: v.string(),
    delivered: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_agent", ["mentionedAgentId"])
    .index("by_undelivered", ["mentionedAgentId", "delivered"]),

  // Métricas de uso (coletadas periodicamente)
  metrics: defineTable({
    type: v.union(
      v.literal("daily"),      // snapshot diário
      v.literal("session"),    // por sessão
      v.literal("aggregate")   // agregado geral
    ),
    date: v.string(),          // YYYY-MM-DD
    sessionKey: v.optional(v.string()),
    agentId: v.optional(v.id("agents")),
    totalTokens: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    cost: v.optional(v.number()),        // USD
    requestCount: v.optional(v.number()),
    avgLatency: v.optional(v.number()),  // ms
    model: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_type_date", ["type", "date"])
    .index("by_session", ["sessionKey"]),
});
