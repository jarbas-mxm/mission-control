import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ============ QUERIES ============

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tasks").order("desc").collect();
  },
});

export const listByStatus = query({
  args: {
    status: v.union(
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("done"),
      v.literal("blocked")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

export const listByAgent = query({
  args: { agentName: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.agentName))
      .first();

    if (!agent) return [];

    const tasks = await ctx.db.query("tasks").collect();
    return tasks.filter((t) => t.assigneeIds.includes(agent._id));
  },
});

export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Detalhe completo da task com histórico e assignees
export const getDetail = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) return null;

    // Buscar assignees
    const agents = await ctx.db.query("agents").collect();
    const assignees = task.assigneeIds
      .map((id) => agents.find((a) => a._id === id))
      .filter(Boolean);

    // Buscar criador
    const creator = task.createdBy
      ? agents.find((a) => a._id === task.createdBy)
      : null;

    // Buscar histórico de atividades da task
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_created")
      .order("desc")
      .collect();

    const taskActivities = activities
      .filter((a) => a.taskId === args.id)
      .slice(0, 50)
      .map((a) => {
        const agent = a.agentId ? agents.find((ag) => ag._id === a.agentId) : null;
        return {
          ...a,
          agentName: agent?.name,
          agentEmoji: agent?.emoji,
        };
      });

    // Buscar comentários da task
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_task", (q) => q.eq("taskId", args.id))
      .collect();

    const comments = messages.map((m) => {
      const agent = m.agentId ? agents.find((ag) => ag._id === m.agentId) : null;
      return {
        ...m,
        agentName: agent?.name || m.senderName,
        agentEmoji: agent?.emoji,
      };
    });

    return {
      ...task,
      assignees,
      creator,
      activities: taskActivities,
      comments,
    };
  },
});

export const getKanban = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();
    const agents = await ctx.db.query("agents").collect();

    // Enriquecer tasks com dados dos assignees
    const enrichedTasks = tasks.map((task) => ({
      ...task,
      assignees: task.assigneeIds
        .map((id) => agents.find((a) => a._id === id))
        .filter(Boolean),
    }));

    return {
      inbox: enrichedTasks.filter((t) => t.status === "inbox"),
      assigned: enrichedTasks.filter((t) => t.status === "assigned"),
      in_progress: enrichedTasks.filter((t) => t.status === "in_progress"),
      done: enrichedTasks.filter((t) => t.status === "done"),
      blocked: enrichedTasks.filter((t) => t.status === "blocked"),
    };
  },
});

// ============ MUTATIONS ============

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    assigneeNames: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    createdByName: v.optional(v.string()),
    estimatedMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Resolver nomes para IDs
    const assigneeIds: any[] = [];
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

    const status = assigneeIds.length > 0 ? "assigned" : "inbox";

    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      status,
      priority: args.priority || "medium",
      assigneeIds,
      tags: args.tags,
      createdBy,
      createdAt: now,
      updatedAt: now,
      assignedAt: assigneeIds.length > 0 ? now : undefined,
      estimatedMinutes: args.estimatedMinutes,
    });

    // Registrar atividade
    await ctx.db.insert("activities", {
      type: "task_created",
      agentId: createdBy,
      taskId,
      message: `Task created: "${args.title}"`,
      createdAt: now,
    });

    // Notificar assignees
    for (const agentId of assigneeIds) {
      const agent = await ctx.db.get(agentId);
      const agentName = (agent as any)?.name || "Unknown";
      await ctx.db.insert("activities", {
        type: "task_assigned",
        agentId,
        taskId,
        message: `${agentName} was assigned to "${args.title}"`,
        createdAt: now,
      });
    }

    return taskId;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("tasks"),
    status: v.union(
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("done"),
      v.literal("blocked")
    ),
    agentName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");

    const now = Date.now();
    const updates: any = {
      status: args.status,
      updatedAt: now,
    };

    // Timestamps de ciclo de vida
    if (args.status === "assigned" && !task.assignedAt) {
      updates.assignedAt = now;
    }
    if (args.status === "in_progress" && !task.startedAt) {
      updates.startedAt = now;
    }
    if (args.status === "done" && !task.completedAt) {
      updates.completedAt = now;
      if (task.startedAt) {
        updates.actualMinutes = Math.round((now - task.startedAt) / 60000);
      }
    }

    await ctx.db.patch(args.id, updates);

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

    const activityType =
      args.status === "done" ? "task_completed" : "task_updated";
    await ctx.db.insert("activities", {
      type: activityType,
      agentId,
      taskId: args.id,
      message: `"${task.title}" moved to ${args.status.replace("_", " ")}`,
      createdAt: now,
    });

    return args.id;
  },
});

export const assign = mutation({
  args: {
    id: v.id("tasks"),
    assigneeNames: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");

    const now = Date.now();
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
      assignedAt: now,
      updatedAt: now,
    });

    // Registrar atividades e notificações
    for (const agentId of assigneeIds) {
      const agent = await ctx.db.get(agentId);
      const assigneeName = (agent as any)?.name || "Unknown";
      await ctx.db.insert("activities", {
        type: "task_assigned",
        agentId,
        taskId: args.id,
        message: `${assigneeName} was assigned to "${task.title}"`,
        createdAt: now,
      });

      await ctx.db.insert("notifications", {
        mentionedAgentId: agentId,
        taskId: args.id,
        content: `You were assigned to: ${task.title}`,
        delivered: false,
        createdAt: now,
      });
    }

    return args.id;
  },
});

export const addComment = mutation({
  args: {
    taskId: v.id("tasks"),
    agentName: v.optional(v.string()),
    senderName: v.optional(v.string()),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    let agentId = undefined;
    let displayName = args.senderName || "Unknown";

    const argAgentName = args.agentName;
    if (argAgentName) {
      const agent = await ctx.db
        .query("agents")
        .withIndex("by_name", (q) => q.eq("name", argAgentName))
        .first();
      if (agent) {
        agentId = agent._id;
        displayName = agent.name;
      }
    }

    const now = Date.now();

    // Criar mensagem
    await ctx.db.insert("messages", {
      taskId: args.taskId,
      agentId,
      senderName: args.senderName,
      content: args.content,
      type: "comment",
      createdAt: now,
    });

    // Registrar atividade
    await ctx.db.insert("activities", {
      type: "task_commented",
      agentId,
      taskId: args.taskId,
      message: `${displayName} commented on "${task.title}"`,
      metadata: { preview: args.content.substring(0, 100) },
      createdAt: now,
    });

    return args.taskId;
  },
});

// Adicionar entrega/anexo à task
export const addDeliverable = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.string(),
    url: v.string(),
    type: v.optional(v.union(
      v.literal("file"),
      v.literal("link"),
      v.literal("sheet"),
      v.literal("doc"),
      v.literal("other")
    )),
    addedByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const now = Date.now();
    const deliverable = {
      title: args.title,
      url: args.url,
      type: args.type || "link",
      addedBy: args.addedByName,
      addedAt: now,
    };

    const existingDeliverables = task.deliverables || [];

    await ctx.db.patch(args.taskId, {
      deliverables: [...existingDeliverables, deliverable],
      updatedAt: now,
    });

    // Registrar atividade
    await ctx.db.insert("activities", {
      type: "task_updated",
      taskId: args.taskId,
      message: `Deliverable added to "${task.title}": ${args.title}`,
      metadata: { deliverable },
      createdAt: now,
    });

    return args.taskId;
  },
});

// Remover entrega/anexo da task
export const removeDeliverable = mutation({
  args: {
    taskId: v.id("tasks"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const deliverables = (task.deliverables || []).filter(
      (d) => d.url !== args.url
    );

    await ctx.db.patch(args.taskId, {
      deliverables,
      updatedAt: Date.now(),
    });

    return args.taskId;
  },
});

// Atualizar descrição da task
export const updateDescription = mutation({
  args: {
    id: v.id("tasks"),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      description: args.description,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { deleted: true };
  },
});
