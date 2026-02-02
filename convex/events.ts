import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Adicionar evento ao feed
export const add = mutation({
  args: {
    agentId: v.optional(v.id("agents")),
    taskId: v.optional(v.id("tasks")),
    type: v.union(
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
      v.literal("decision_made"),
      v.literal("message_sent"),
      v.literal("agent_status_changed")
    ),
    message: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("activities", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Buscar eventos recentes
export const getRecent = query({
  args: {
    limit: v.optional(v.number()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, { limit = 50, type }) => {
    let query = ctx.db.query("activities").withIndex("by_created").order("desc");

    if (type) {
      // Se type for fornecido, não podemos usar withIndex diretamente
      const all = await query.take(200);
      const filtered = all.filter((a) => a.type === type);
      return filtered.slice(0, limit);
    }

    return await query.take(limit);
  },
});

// Buscar eventos de um agente específico
export const getByAgent = query({
  args: {
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { agentId, limit = 50 }) => {
    return await ctx.db
      .query("activities")
      .withIndex("by_agent", (q) => q.eq("agentId", agentId))
      .order("desc")
      .take(limit);
  },
});

// Limpar eventos antigos (manter últimos 7 dias)
export const cleanup = mutation({
  args: {},
  handler: async (ctx) => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    const oldEvents = await ctx.db
      .query("activities")
      .withIndex("by_created")
      .filter((q) => q.lt(q.field("createdAt"), weekAgo))
      .collect();

    let deleted = 0;
    for (const event of oldEvents) {
      await ctx.db.delete(event._id);
      deleted++;
    }

    return { deleted };
  },
});
