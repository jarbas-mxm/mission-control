import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Criar uma nova task
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    assigneeNames: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    createdByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Resolver nomes para IDs
    let assigneeIds: any[] = [];
    if (args.assigneeNames) {
      for (const name of args.assigneeNames) {
        const agent = await ctx.db
          .query("agents")
          .withIndex("by_name", (q) => q.eq("name", name))
          .first();
        if (agent) assigneeIds.push(agent._id);
      }
    }
    
    let createdBy = undefined;
    const createdByName = args.createdByName;
    if (createdByName) {
      const creator = await ctx.db
        .query("agents")
        .withIndex("by_name", (q) => q.eq("name", createdByName))
        .first();
      if (creator) createdBy = creator._id;
    }
    
    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      status: assigneeIds.length > 0 ? "assigned" : "inbox",
      priority: args.priority || "medium",
      assigneeIds,
      tags: args.tags,
      createdBy,
      createdAt: now,
      updatedAt: now,
    });
    
    // Registrar atividade
    await ctx.db.insert("activities", {
      type: "task_created",
      agentId: createdBy,
      taskId,
      message: `Task criada: ${args.title}`,
      createdAt: now,
    });
    
    return taskId;
  },
});

// Listar todas as tasks
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tasks").collect();
  },
});

// Listar tasks por status
export const listByStatus = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", args.status as any))
        .collect();
    }
    return await ctx.db.query("tasks").collect();
  },
});

// Buscar task por ID
export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Atualizar status da task
export const updateStatus = mutation({
  args: {
    id: v.id("tasks"),
    status: v.union(
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done"),
      v.literal("blocked")
    ),
    agentName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");
    
    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: now,
    });
    
    // Registrar atividade
    let agentId = undefined;
    const agentName = args.agentName;
    if (agentName) {
      const agent = await ctx.db
        .query("agents")
        .withIndex("by_name", (q) => q.eq("name", agentName))
        .first();
      if (agent) agentId = agent._id;
    }
    
    const activityType = args.status === "done" ? "task_completed" : "task_updated";
    await ctx.db.insert("activities", {
      type: activityType,
      agentId,
      taskId: args.id,
      message: `Task "${task.title}" movida para ${args.status}`,
      createdAt: now,
    });
    
    return args.id;
  },
});

// Atribuir task a agentes
export const assign = mutation({
  args: {
    id: v.id("tasks"),
    assigneeNames: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");
    
    const assigneeIds: any[] = [];
    for (const name of args.assigneeNames) {
      const agent = await ctx.db
        .query("agents")
        .withIndex("by_name", (q) => q.eq("name", name))
        .first();
      if (agent) assigneeIds.push(agent._id);
    }
    
    await ctx.db.patch(args.id, {
      assigneeIds,
      status: "assigned",
      updatedAt: Date.now(),
    });
    
    // Criar notificações para os assignees
    for (const agentId of assigneeIds) {
      await ctx.db.insert("notifications", {
        mentionedAgentId: agentId,
        taskId: args.id,
        content: `Você foi atribuído à task: ${task.title}`,
        delivered: false,
        createdAt: Date.now(),
      });
    }
    
    return args.id;
  },
});

// Buscar tasks de um agente
export const getByAgent = query({
  args: { agentName: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.agentName))
      .first();
    
    if (!agent) return [];
    
    const tasks = await ctx.db.query("tasks").collect();
    return tasks.filter(t => t.assigneeIds.includes(agent._id));
  },
});
