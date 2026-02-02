import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ============ QUERIES ============

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("agents").collect();
  },
});

export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    return agents.filter((a) => a.status !== "offline");
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    const tasks = await ctx.db.query("tasks").collect();

    return {
      totalAgents: agents.length,
      activeAgents: agents.filter((a) => a.status !== "offline").length,
      workingAgents: agents.filter((a) => a.status === "working").length,
      totalTasks: tasks.length,
      tasksByStatus: {
        inbox: tasks.filter((t) => t.status === "inbox").length,
        assigned: tasks.filter((t) => t.status === "assigned").length,
        in_progress: tasks.filter((t) => t.status === "in_progress").length,
        review: tasks.filter((t) => t.status === "review").length,
        done: tasks.filter((t) => t.status === "done").length,
      },
    };
  },
});

// ============ MUTATIONS ============

export const create = mutation({
  args: {
    name: v.string(),
    role: v.string(),
    emoji: v.string(),
    level: v.union(
      v.literal("lead"),
      v.literal("specialist"),
      v.literal("intern")
    ),
    avatar: v.optional(v.string()),
    sessionKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        status: "idle",
        lastSeen: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("agents", {
      ...args,
      status: "idle",
      lastSeen: Date.now(),
      tasksCompleted: 0,
      totalTokensUsed: 0,
    });
  },
});

// Agente fica online
export const goOnline = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (!agent) throw new Error(`Agent ${args.name} not found`);

    const wasOffline = agent.status === "offline";

    await ctx.db.patch(agent._id, {
      status: "idle",
      lastSeen: Date.now(),
    });

    if (wasOffline) {
      await ctx.db.insert("activities", {
        type: "agent_online",
        agentId: agent._id,
        message: `${args.name} is now online`,
        createdAt: Date.now(),
      });
    }

    return agent._id;
  },
});

// Agente fica offline
export const goOffline = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (!agent) throw new Error(`Agent ${args.name} not found`);

    await ctx.db.patch(agent._id, {
      status: "offline",
      currentTaskId: undefined,
      lastSeen: Date.now(),
    });

    await ctx.db.insert("activities", {
      type: "agent_offline",
      agentId: agent._id,
      message: `${args.name} went offline`,
      createdAt: Date.now(),
    });

    return agent._id;
  },
});

// Agente pega uma task (automação!)
export const claimTask = mutation({
  args: {
    agentName: v.string(),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.agentName))
      .first();

    if (!agent) throw new Error(`Agent ${args.agentName} not found`);

    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const now = Date.now();

    // Atualiza task para in_progress
    await ctx.db.patch(args.taskId, {
      status: "in_progress",
      startedAt: now,
      updatedAt: now,
    });

    // Atualiza agent para working
    await ctx.db.patch(agent._id, {
      status: "working",
      currentTaskId: args.taskId,
      lastSeen: now,
    });

    // Registra atividade
    await ctx.db.insert("activities", {
      type: "task_started",
      agentId: agent._id,
      taskId: args.taskId,
      message: `${args.agentName} started working on "${task.title}"`,
      createdAt: now,
    });

    return { agentId: agent._id, taskId: args.taskId };
  },
});

// Agente completa uma task (automação!)
export const completeTask = mutation({
  args: {
    agentName: v.string(),
    taskId: v.id("tasks"),
    moveToReview: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.agentName))
      .first();

    if (!agent) throw new Error(`Agent ${args.agentName} not found`);

    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const now = Date.now();
    const newStatus = args.moveToReview ? "review" : "done";

    // Calcula tempo gasto
    const actualMinutes = task.startedAt
      ? Math.round((now - task.startedAt) / 60000)
      : undefined;

    // Atualiza task
    await ctx.db.patch(args.taskId, {
      status: newStatus,
      completedAt: now,
      actualMinutes,
      updatedAt: now,
    });

    // Atualiza agent
    await ctx.db.patch(agent._id, {
      status: "idle",
      currentTaskId: undefined,
      lastSeen: now,
      tasksCompleted: (agent.tasksCompleted || 0) + 1,
    });

    // Registra atividade
    await ctx.db.insert("activities", {
      type: "task_completed",
      agentId: agent._id,
      taskId: args.taskId,
      message: `${args.agentName} completed "${task.title}"`,
      metadata: { actualMinutes },
      createdAt: now,
    });

    return { agentId: agent._id, taskId: args.taskId };
  },
});

// Heartbeat - mantém agente vivo
export const heartbeat = mutation({
  args: {
    name: v.string(),
    isWorking: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (!agent) return null;

    const updates: any = { lastSeen: Date.now() };

    if (args.isWorking !== undefined) {
      updates.status = args.isWorking ? "working" : "idle";
    }

    await ctx.db.patch(agent._id, updates);
    return agent._id;
  },
});

// Reportar uso de tokens
export const reportUsage = mutation({
  args: {
    agentName: v.string(),
    taskId: v.optional(v.id("tasks")),
    sessionId: v.optional(v.string()),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.agentName))
      .first();

    if (!agent) throw new Error(`Agent ${args.agentName} not found`);

    // Calcular custo (aproximado, em centavos USD)
    const costs: Record<string, { input: number; output: number }> = {
      "claude-opus": { input: 0.015, output: 0.075 },
      "claude-sonnet": { input: 0.003, output: 0.015 },
      "claude-haiku": { input: 0.00025, output: 0.00125 },
    };

    const modelCost = costs[args.model] || costs["claude-sonnet"];
    const cost = Math.round(
      (args.inputTokens / 1000) * modelCost.input * 100 +
        (args.outputTokens / 1000) * modelCost.output * 100
    );

    // Inserir registro de uso
    await ctx.db.insert("usage", {
      agentId: agent._id,
      taskId: args.taskId,
      sessionId: args.sessionId,
      model: args.model,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      cost,
      createdAt: Date.now(),
    });

    // Atualizar total do agente
    const totalTokens = args.inputTokens + args.outputTokens;
    await ctx.db.patch(agent._id, {
      totalTokensUsed: (agent.totalTokensUsed || 0) + totalTokens,
    });

    return { cost, totalTokens };
  },
});

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
