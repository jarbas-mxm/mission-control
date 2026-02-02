import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Criar um novo agente
export const create = mutation({
  args: {
    name: v.string(),
    role: v.string(),
    emoji: v.string(),
    status: v.union(v.literal("idle"), v.literal("working"), v.literal("offline")),
    level: v.union(v.literal("lead"), v.literal("specialist"), v.literal("intern")),
    sessionKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verificar se já existe
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    
    if (existing) {
      // Atualizar se já existe
      await ctx.db.patch(existing._id, {
        ...args,
        lastSeen: Date.now(),
      });
      return existing._id;
    }
    
    // Criar novo
    return await ctx.db.insert("agents", {
      ...args,
      lastSeen: Date.now(),
    });
  },
});

// Listar todos os agentes
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("agents").collect();
  },
});

// Buscar agente por nome
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

// Buscar agente por sessionKey
export const getBySessionKey = query({
  args: { sessionKey: v.string() },
  handler: async (ctx, args) => {
    const agents = await ctx.db.query("agents").collect();
    return agents.find(a => a.sessionKey === args.sessionKey);
  },
});

// Atualizar status do agente
export const updateStatus = mutation({
  args: {
    name: v.string(),
    status: v.union(v.literal("idle"), v.literal("working"), v.literal("offline")),
    currentTaskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    
    if (!agent) throw new Error(`Agent ${args.name} not found`);
    
    await ctx.db.patch(agent._id, {
      status: args.status,
      currentTaskId: args.currentTaskId,
      lastSeen: Date.now(),
    });
    
    // Registrar atividade
    await ctx.db.insert("activities", {
      type: "agent_status_changed",
      agentId: agent._id,
      message: `${args.name} está ${args.status === 'working' ? 'trabalhando' : args.status === 'idle' ? 'disponível' : 'offline'}`,
      createdAt: Date.now(),
    });
    
    return agent._id;
  },
});

// Heartbeat - atualiza lastSeen
export const heartbeat = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    
    if (agent) {
      await ctx.db.patch(agent._id, { lastSeen: Date.now() });
    }
    return agent?._id;
  },
});

// Deletar agente por nome
export const remove = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    
    if (!agent) throw new Error(`Agent ${args.name} not found`);
    
    await ctx.db.delete(agent._id);
    return { deleted: args.name };
  },
});
