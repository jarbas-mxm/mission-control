import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Lista atividades recentes (com enriquecimento)
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

        if (act.agentId) {
          const agent = await ctx.db.get(act.agentId);
          agentName = agent?.name;
          agentEmoji = agent?.emoji;
        }

        let taskTitle = undefined;
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

// Lista atividades por tipo (para tabs do Live Feed)
export const listByType = query({
  args: {
    type: v.union(
      v.literal("tasks"),
      v.literal("comments"),
      v.literal("decisions"),
      v.literal("docs"),
      v.literal("status")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const typeMap: Record<string, string[]> = {
      tasks: ["task_created", "task_assigned", "task_started", "task_completed"],
      comments: ["task_commented"],
      decisions: ["decision_made"],
      docs: ["document_created"],
      status: ["agent_online", "agent_offline", "agent_working", "task_updated"],
    };

    const validTypes = typeMap[args.type] || [];

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_created")
      .order("desc")
      .take(args.limit || 100);

    // Filtrar por tipo
    const filtered = activities.filter((a) => validTypes.includes(a.type));

    // Enriquecer
    const enriched = await Promise.all(
      filtered.slice(0, args.limit || 50).map(async (act) => {
        let agentName = undefined;
        let agentEmoji = undefined;

        if (act.agentId) {
          const agent = await ctx.db.get(act.agentId);
          agentName = agent?.name;
          agentEmoji = agent?.emoji;
        }

        let taskTitle = undefined;
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

// Lista atividades por agente (para filtro)
export const listByAgent = query({
  args: {
    agentName: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.agentName))
      .first();

    if (!agent) return [];

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
      .order("desc")
      .take(args.limit || 50);

    // Enriquecer
    const enriched = await Promise.all(
      activities.map(async (act) => {
        let taskTitle = undefined;
        if (act.taskId) {
          const task = await ctx.db.get(act.taskId);
          taskTitle = task?.title;
        }

        return {
          ...act,
          agentName: agent.name,
          agentEmoji: agent.emoji,
          taskTitle,
        };
      })
    );

    return enriched;
  },
});

// Contagem por tipo (para badges nas tabs)
export const getCounts = query({
  args: {},
  handler: async (ctx) => {
    const activities = await ctx.db.query("activities").collect();

    const taskTypes = [
      "task_created",
      "task_assigned",
      "task_started",
      "task_completed",
    ];
    const commentTypes = ["task_commented"];
    const decisionTypes = ["decision_made"];
    const docTypes = ["document_created"];
    const statusTypes = [
      "agent_online",
      "agent_offline",
      "agent_working",
      "task_updated",
    ];

    return {
      all: activities.length,
      tasks: activities.filter((a) => taskTypes.includes(a.type)).length,
      comments: activities.filter((a) => commentTypes.includes(a.type)).length,
      decisions: activities.filter((a) => decisionTypes.includes(a.type)).length,
      docs: activities.filter((a) => docTypes.includes(a.type)).length,
      status: activities.filter((a) => statusTypes.includes(a.type)).length,
    };
  },
});

// Atividade por agente (para filtro dropdown)
export const getAgentActivityCounts = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    const activities = await ctx.db.query("activities").collect();

    const counts = agents.map((agent) => ({
      name: agent.name,
      emoji: agent.emoji,
      count: activities.filter((a) => a.agentId === agent._id).length,
    }));

    return counts.sort((a, b) => b.count - a.count);
  },
});

// ============ MUTATIONS ============

// Registrar atividade (usado pela API HTTP)
export const log = mutation({
  args: {
    type: v.string(),
    agentName: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
    message: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    let agentId = undefined;
    
    if (args.agentName) {
      const agent = await ctx.db
        .query("agents")
        .withIndex("by_name", (q) => q.eq("name", args.agentName))
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
