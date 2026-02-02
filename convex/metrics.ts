import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Listar métricas por tipo e período
export const list = query({
  args: {
    type: v.optional(v.union(v.literal("daily"), v.literal("session"), v.literal("aggregate"))),
    limit: v.optional(v.number()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 30;
    
    let metrics;
    
    if (args.type) {
      const typeFilter = args.type;
      metrics = await ctx.db
        .query("metrics")
        .withIndex("by_type_date", (q) => q.eq("type", typeFilter))
        .order("desc")
        .take(limit);
    } else {
      metrics = await ctx.db
        .query("metrics")
        .withIndex("by_date")
        .order("desc")
        .take(limit);
    }
    
    // Filtrar por datas se especificado
    let filtered = metrics;
    if (args.startDate) {
      filtered = filtered.filter(m => m.date >= args.startDate!);
    }
    if (args.endDate) {
      filtered = filtered.filter(m => m.date <= args.endDate!);
    }
    
    return filtered;
  },
});

// Obter resumo agregado
export const summary = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 7;
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const startStr = startDate.toISOString().split("T")[0];
    
    const dailyMetrics = await ctx.db
      .query("metrics")
      .withIndex("by_type_date", (q) => q.eq("type", "daily"))
      .order("desc")
      .take(days);
    
    const filtered = dailyMetrics.filter(m => m.date >= startStr);
    
    const totalTokens = filtered.reduce((sum, m) => sum + m.totalTokens, 0);
    const totalCost = filtered.reduce((sum, m) => sum + (m.cost ?? 0), 0);
    const avgDailyTokens = filtered.length > 0 ? totalTokens / filtered.length : 0;
    const avgDailyCost = filtered.length > 0 ? totalCost / filtered.length : 0;
    
    // Trend: comparar primeira metade com segunda metade
    const half = Math.floor(filtered.length / 2);
    const firstHalf = filtered.slice(half);
    const secondHalf = filtered.slice(0, half);
    
    const firstHalfTokens = firstHalf.reduce((sum, m) => sum + m.totalTokens, 0);
    const secondHalfTokens = secondHalf.reduce((sum, m) => sum + m.totalTokens, 0);
    
    const trend = firstHalfTokens > 0 
      ? ((secondHalfTokens - firstHalfTokens) / firstHalfTokens) * 100 
      : 0;
    
    return {
      days,
      totalTokens,
      totalCost,
      avgDailyTokens: Math.round(avgDailyTokens),
      avgDailyCost: Math.round(avgDailyCost * 100) / 100,
      trend: Math.round(trend),
      dataPoints: filtered.length,
      latestDate: filtered[0]?.date ?? null,
    };
  },
});

// Obter métricas por sessão/agente
export const bySession = query({
  args: {
    sessionKey: v.optional(v.string()),
    agentId: v.optional(v.id("agents")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    
    if (args.sessionKey) {
      return await ctx.db
        .query("metrics")
        .withIndex("by_session", (q) => q.eq("sessionKey", args.sessionKey))
        .order("desc")
        .take(limit);
    }
    
    // Se agentId, buscar todas as métricas desse agente
    const all = await ctx.db
      .query("metrics")
      .order("desc")
      .take(limit * 10);
    
    if (args.agentId) {
      return all.filter(m => m.agentId === args.agentId).slice(0, limit);
    }
    
    return all.slice(0, limit);
  },
});

// Registrar métrica
export const record = mutation({
  args: {
    type: v.union(v.literal("daily"), v.literal("session"), v.literal("aggregate")),
    date: v.string(),
    sessionKey: v.optional(v.string()),
    agentId: v.optional(v.id("agents")),
    totalTokens: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    cost: v.optional(v.number()),
    requestCount: v.optional(v.number()),
    avgLatency: v.optional(v.number()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("metrics", {
      ...args,
      createdAt: Date.now(),
    });
    return id;
  },
});

// Upsert métrica diária (atualiza se existir, cria se não)
export const upsertDaily = mutation({
  args: {
    date: v.string(),
    totalTokens: v.number(),
    cost: v.optional(v.number()),
    requestCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Buscar métrica existente para esta data
    const existing = await ctx.db
      .query("metrics")
      .withIndex("by_type_date", (q) => q.eq("type", "daily"))
      .filter((q) => q.eq(q.field("date"), args.date))
      .first();
    
    if (existing) {
      // Atualizar
      await ctx.db.patch(existing._id, {
        totalTokens: args.totalTokens,
        cost: args.cost,
        requestCount: args.requestCount,
        createdAt: Date.now(),
      });
      return existing._id;
    } else {
      // Criar novo
      const id = await ctx.db.insert("metrics", {
        type: "daily",
        date: args.date,
        totalTokens: args.totalTokens,
        cost: args.cost,
        requestCount: args.requestCount,
        createdAt: Date.now(),
      });
      return id;
    }
  },
});

// Limpar métricas antigas (manter últimos N dias)
export const cleanup = mutation({
  args: {
    keepDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const keepDays = args.keepDays ?? 90;
    const cutoffDate = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];
    
    const oldMetrics = await ctx.db
      .query("metrics")
      .withIndex("by_date")
      .filter((q) => q.lt(q.field("date"), cutoffStr))
      .take(100);
    
    for (const metric of oldMetrics) {
      await ctx.db.delete(metric._id);
    }
    
    return { deleted: oldMetrics.length };
  },
});
