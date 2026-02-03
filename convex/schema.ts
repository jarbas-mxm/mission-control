import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Agentes do sistema
  agents: defineTable({
    name: v.string(),
    role: v.string(),
    emoji: v.string(),
    avatar: v.optional(v.string()), // URL da imagem ou inicial
    status: v.union(
      v.literal("idle"),
      v.literal("working"),
      v.literal("offline")
    ),
    level: v.union(
      v.literal("lead"),
      v.literal("specialist"),
      v.literal("intern")
    ),
    sessionKey: v.optional(v.string()),
    currentTaskId: v.optional(v.id("tasks")),
    lastSeen: v.optional(v.number()),
    // Métricas
    tasksCompleted: v.optional(v.number()),
    totalTokensUsed: v.optional(v.number()),
    // Notion sync
    notionId: v.optional(v.string()),
  })
    .index("by_name", ["name"])
    .index("by_status", ["status"]),

  // Counters for sequential IDs
  counters: defineTable({
    name: v.string(),
    value: v.number(),
  }).index("by_name", ["name"]),

  // Tasks do Kanban
  tasks: defineTable({
    taskNumber: v.optional(v.number()), // Sequential ID (#001, #002, etc)
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("done"),
      v.literal("blocked")
    ),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    assigneeIds: v.array(v.id("agents")),
    tags: v.optional(v.array(v.string())),
    createdBy: v.optional(v.id("agents")),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Timestamps de ciclo de vida
    assignedAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    // Estimativas
    estimatedMinutes: v.optional(v.number()),
    actualMinutes: v.optional(v.number()),
    // Entregas/Anexos
    deliverables: v.optional(v.array(v.object({
      title: v.string(),
      url: v.string(),
      type: v.optional(v.union(
        v.literal("file"),
        v.literal("link"),
        v.literal("sheet"),
        v.literal("doc"),
        v.literal("other")
      )),
      addedBy: v.optional(v.string()),
      addedAt: v.number(),
    }))),
    // Notion sync
    notionId: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_assignee", ["assigneeIds"])
    .index("by_created", ["createdAt"]),

  // Mensagens/Comentários
  messages: defineTable({
    taskId: v.optional(v.id("tasks")),
    agentId: v.optional(v.id("agents")),
    senderName: v.optional(v.string()),
    content: v.string(),
    type: v.optional(
      v.union(
        v.literal("comment"),
        v.literal("decision"),
        v.literal("status_update"),
        v.literal("chat")
      )
    ),
    attachments: v.optional(v.array(v.string())),
    createdAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_type", ["type"])
    .index("by_created", ["createdAt"]),

  // Feed de atividades (expandido)
  activities: defineTable({
    type: v.union(
      // Legacy types
      v.literal("message_sent"),
      v.literal("agent_status_changed"),
      // New types
      v.literal("task_created"),
      v.literal("task_assigned"),
      v.literal("task_started"),
      v.literal("task_completed"),
      v.literal("task_updated"),
      v.literal("task_commented"),
      v.literal("agent_online"),
      v.literal("agent_offline"),
      v.literal("agent_working"),
      v.literal("document_created"),
      v.literal("decision_made")
    ),
    agentId: v.optional(v.id("agents")),
    taskId: v.optional(v.id("tasks")),
    message: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_created", ["createdAt"])
    .index("by_type", ["type"])
    .index("by_agent", ["agentId"]),

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

  // Usage tracking (tokens, custos)
  usage: defineTable({
    agentId: v.id("agents"),
    taskId: v.optional(v.id("tasks")),
    sessionId: v.optional(v.string()),
    model: v.string(), // claude-sonnet, claude-opus, etc
    inputTokens: v.number(),
    outputTokens: v.number(),
    cost: v.number(), // em centavos USD
    createdAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_created", ["createdAt"])
    .index("by_task", ["taskId"]),

  // Notificações
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

  // Logs do terminal (para visualização em tempo real)
  terminalLogs: defineTable({
    agentId: v.id("agents"),
    level: v.union(
      v.literal("info"),
      v.literal("success"),
      v.literal("warning"),
      v.literal("error"),
      v.literal("system")
    ),
    message: v.string(),
    taskId: v.optional(v.id("tasks")),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_agent_created", ["agentId", "createdAt"])
    .index("by_created", ["createdAt"]),
});
