import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Listar atividades recentes
export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_created")
      .order("desc")
      .take(args.limit || 50);
    
    // Enriquecer com dados do agente e task
    const enriched = await Promise.all(
      activities.map(async (act) => {
        let agentName = undefined;
        let agentEmoji = undefined;
        let taskTitle = undefined;
        
        if (act.agentId) {
          const agent = await ctx.db.get(act.agentId);
          agentName = agent?.name;
          agentEmoji = agent?.emoji;
        }
        
        if (act.taskId) {
          const task = await ctx.db.get(act.taskId);
          taskTitle = task?.title;
        }
        
        return {
          ...act,
          agentName,
          agentEmoji,
          taskTitle,
        };
      })
    );
    
    return enriched;
  },
});

// Criar atividade manual
export const create = mutation({
  args: {
    type: v.union(
      v.literal("task_created"),
      v.literal("task_updated"),
      v.literal("task_completed"),
      v.literal("message_sent"),
      v.literal("agent_status_changed"),
      v.literal("document_created")
    ),
    agentName: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
    message: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    let agentId = undefined;
    const agentName = args.agentName;
    if (agentName) {
      const agent = await ctx.db
        .query("agents")
        .withIndex("by_name", (q) => q.eq("name", agentName))
        .first();
      if (agent) agentId = agent._id;
    }
    
    return await ctx.db.insert("activities", {
      type: args.type,
      agentId,
      taskId: args.taskId,
      message: args.message,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});
