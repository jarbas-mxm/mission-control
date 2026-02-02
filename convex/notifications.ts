import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Buscar notificações não entregues de um agente
export const getUndelivered = query({
  args: { agentName: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.agentName))
      .first();
    
    if (!agent) return [];
    
    return await ctx.db
      .query("notifications")
      .withIndex("by_undelivered", (q) => 
        q.eq("mentionedAgentId", agent._id).eq("delivered", false)
      )
      .collect();
  },
});

// Buscar TODAS as notificações não entregues (para o daemon)
export const getAllUndelivered = query({
  args: {},
  handler: async (ctx) => {
    const notifications = await ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("delivered"), false))
      .collect();
    
    // Enriquecer com nome do agente
    const enriched = await Promise.all(
      notifications.map(async (notif) => {
        const agent = await ctx.db.get(notif.mentionedAgentId);
        return {
          ...notif,
          agentName: agent?.name,
          sessionKey: agent?.sessionKey,
        };
      })
    );
    
    return enriched;
  },
});

// Marcar notificação como entregue
export const markDelivered = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { delivered: true });
    return true;
  },
});

// Criar notificação manual (@mention)
export const create = mutation({
  args: {
    mentionedAgentName: v.string(),
    fromAgentName: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const mentionedAgent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.mentionedAgentName))
      .first();
    
    if (!mentionedAgent) throw new Error(`Agent ${args.mentionedAgentName} not found`);
    
    let fromAgentId = undefined;
    const fromAgentName = args.fromAgentName;
    if (fromAgentName) {
      const fromAgent = await ctx.db
        .query("agents")
        .withIndex("by_name", (q) => q.eq("name", fromAgentName))
        .first();
      if (fromAgent) fromAgentId = fromAgent._id;
    }
    
    return await ctx.db.insert("notifications", {
      mentionedAgentId: mentionedAgent._id,
      fromAgentId,
      taskId: args.taskId,
      content: args.content,
      delivered: false,
      createdAt: Date.now(),
    });
  },
});
