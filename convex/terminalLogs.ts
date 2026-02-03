import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Adicionar log ao terminal
export const add = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("terminalLogs", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Buscar logs de um agente (últimos 100)
export const getByAgent = query({
  args: {
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { agentId, limit = 100 }) => {
    const logs = await ctx.db
      .query("terminalLogs")
      .withIndex("by_agent_created", (q) => q.eq("agentId", agentId))
      .order("desc")
      .take(limit);

    return logs.reverse(); // Mais antigos primeiro
  },
});

// Buscar logs recentes de todos os agentes
export const getRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 50 }) => {
    return await ctx.db
      .query("terminalLogs")
      .withIndex("by_created")
      .order("desc")
      .take(limit);
  },
});

// Limpar logs antigos (manter apenas últimas 24h por agente)
export const cleanup = mutation({
  args: {},
  handler: async (ctx) => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    const oldLogs = await ctx.db
      .query("terminalLogs")
      .withIndex("by_created")
      .filter((q) => q.lt(q.field("createdAt"), dayAgo))
      .collect();

    let deleted = 0;
    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
      deleted++;
    }

    return { deleted };
  },
});

// Adicionar log pelo nome do agente (para API HTTP)
export const addByName = mutation({
  args: {
    agentName: v.string(),
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
  },
  handler: async (ctx, args) => {
    // Buscar agente pelo nome
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.agentName))
      .first();
    
    if (!agent) {
      throw new Error(`Agent "${args.agentName}" not found`);
    }
    
    return await ctx.db.insert("terminalLogs", {
      agentId: agent._id,
      level: args.level,
      message: args.message,
      taskId: args.taskId,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});
