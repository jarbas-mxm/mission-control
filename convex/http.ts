import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// ============ CORS HEADERS ============
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

// ============ OPTIONS (CORS preflight) ============
http.route({
  path: "/api/tasks/create",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/api/tasks/update-status",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/api/agents/status",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/api/agents/heartbeat",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/api/activities/log",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/api/terminal/log",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

// ============ TASK ENDPOINTS ============

// POST /api/tasks/create - Criar nova task
http.route({
  path: "/api/tasks/create",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      
      if (!body.title) {
        return errorResponse("title is required");
      }
      
      const taskId = await ctx.runMutation(api.tasks.create, {
        title: body.title,
        description: body.description,
        priority: body.priority || "medium",
        assigneeNames: body.assigneeNames || body.assignees,
        tags: body.tags,
        createdByName: body.createdByName || body.createdBy,
        estimatedMinutes: body.estimatedMinutes,
      });
      
      return jsonResponse({ 
        success: true, 
        id: taskId,
        message: `Task "${body.title}" created successfully`
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

// POST /api/tasks/update-status - Atualizar status da task
http.route({
  path: "/api/tasks/update-status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      
      if (!body.taskId) {
        return errorResponse("taskId is required");
      }
      if (!body.status) {
        return errorResponse("status is required");
      }
      
      // Mapear status do Notion para Convex
      const statusMap: Record<string, string> = {
        "Inbox": "inbox",
        "Assigned": "assigned",
        "In Progress": "in_progress",
        "in progress": "in_progress",
        "Done": "done",
        "Blocked": "blocked",
        // Lowercase variants
        "inbox": "inbox",
        "assigned": "assigned",
        "in_progress": "in_progress",
        "done": "done",
        "blocked": "blocked",
      };
      
      const convexStatus = statusMap[body.status] || body.status;
      
      await ctx.runMutation(api.tasks.updateStatus, {
        id: body.taskId,
        status: convexStatus as any,
        agentName: body.agentName,
      });
      
      return jsonResponse({ 
        success: true,
        message: `Task status updated to ${convexStatus}`
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

// ============ AGENT ENDPOINTS ============

// POST /api/agents/status - Atualizar status do agente por nome
http.route({
  path: "/api/agents/status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      
      if (!body.agentName) {
        return errorResponse("agentName is required");
      }
      if (!body.status) {
        return errorResponse("status is required");
      }
      
      // Mapear status do Notion para Convex
      const statusMap: Record<string, string> = {
        "Online": "idle",
        "Offline": "offline",
        "Working": "working",
        // Lowercase variants
        "online": "idle",
        "offline": "offline",
        "working": "working",
        "idle": "idle",
      };
      
      const convexStatus = statusMap[body.status] || body.status;
      
      // Usar goOnline/goOffline ou heartbeat
      if (convexStatus === "offline") {
        await ctx.runMutation(api.agents.goOffline, {
          name: body.agentName,
        });
      } else {
        await ctx.runMutation(api.agents.goOnline, {
          name: body.agentName,
        });
        
        // Se está working, atualizar com heartbeat
        if (convexStatus === "working") {
          await ctx.runMutation(api.agents.heartbeat, {
            name: body.agentName,
            isWorking: true,
          });
        }
      }
      
      return jsonResponse({ 
        success: true,
        message: `Agent ${body.agentName} status updated to ${convexStatus}`
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

// POST /api/agents/heartbeat - Heartbeat do agente
http.route({
  path: "/api/agents/heartbeat",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      
      if (!body.agentName) {
        return errorResponse("agentName is required");
      }
      
      const result = await ctx.runMutation(api.agents.heartbeat, {
        name: body.agentName,
        isWorking: body.isWorking,
      });
      
      return jsonResponse({ 
        success: true,
        agentId: result,
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

// POST /api/agents/claim-task - Agente pega uma task
http.route({
  path: "/api/agents/claim-task",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      
      if (!body.agentName) {
        return errorResponse("agentName is required");
      }
      if (!body.taskId) {
        return errorResponse("taskId is required");
      }
      
      const result = await ctx.runMutation(api.agents.claimTask, {
        agentName: body.agentName,
        taskId: body.taskId,
      });
      
      return jsonResponse({ 
        success: true,
        ...result,
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

// POST /api/agents/complete-task - Agente completa uma task
http.route({
  path: "/api/agents/complete-task",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      
      if (!body.agentName) {
        return errorResponse("agentName is required");
      }
      if (!body.taskId) {
        return errorResponse("taskId is required");
      }
      
      const result = await ctx.runMutation(api.agents.completeTask, {
        agentName: body.agentName,
        taskId: body.taskId,
      });
      
      return jsonResponse({ 
        success: true,
        ...result,
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

// ============ ACTIVITY ENDPOINTS ============

// POST /api/activities/log - Registrar atividade
http.route({
  path: "/api/activities/log",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      
      if (!body.type) {
        return errorResponse("type is required");
      }
      if (!body.message) {
        return errorResponse("message is required");
      }
      
      // Build args, only including optional fields if valid
      const args: any = {
        type: body.type,
        message: body.message,
      };
      
      if (body.agentName) {
        args.agentName = body.agentName;
      }
      
      // Only add taskId if it's a valid Convex ID
      if (body.taskId && typeof body.taskId === 'string' && body.taskId.length > 10) {
        args.taskId = body.taskId;
      }
      
      if (body.metadata) {
        args.metadata = body.metadata;
      }
      
      const activityId = await ctx.runMutation(api.activities.log, args);
      
      return jsonResponse({ 
        success: true,
        id: activityId,
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

// ============ TERMINAL LOG ENDPOINTS ============

// POST /api/terminal/log - Log para terminal em tempo real
http.route({
  path: "/api/terminal/log",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      
      if (!body.agentName) {
        return errorResponse("agentName is required");
      }
      if (!body.message) {
        return errorResponse("message is required");
      }
      
      // Build args, only including taskId if it's a valid string
      const args: any = {
        agentName: body.agentName,
        level: body.level || "info",
        message: body.message,
      };
      
      // Only add taskId if it's a non-empty string (Convex ID)
      if (body.taskId && typeof body.taskId === 'string' && body.taskId.length > 10) {
        args.taskId = body.taskId;
      }
      
      if (body.metadata) {
        args.metadata = body.metadata;
      }
      
      const logId = await ctx.runMutation(api.terminalLogs.addByName, args);
      
      return jsonResponse({ 
        success: true,
        id: logId,
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

// ============ NOTIFICATION ENDPOINTS ============

http.route({
  path: "/api/notifications/pending",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/api/notifications/create",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/api/notifications/mark-delivered",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

// GET /api/notifications/pending?agent=Jarbas - Get pending notifications
http.route({
  path: "/api/notifications/pending",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const agentName = url.searchParams.get("agent");
      
      if (!agentName) {
        return errorResponse("agent query param is required");
      }
      
      const notifications = await ctx.runQuery(api.notifications.getUndelivered, {
        agentName: agentName,
      });
      
      return jsonResponse({ 
        success: true,
        count: notifications.length,
        notifications,
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

// POST /api/notifications/create - Create a notification
http.route({
  path: "/api/notifications/create",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      
      if (!body.toAgent) {
        return errorResponse("toAgent is required");
      }
      if (!body.content) {
        return errorResponse("content is required");
      }
      
      const id = await ctx.runMutation(api.notifications.create, {
        mentionedAgentName: body.toAgent,
        fromAgentName: body.fromAgent,
        taskId: body.taskId,
        content: body.content,
      });
      
      return jsonResponse({ 
        success: true,
        id,
        message: `Notification created for ${body.toAgent}`
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

// POST /api/notifications/mark-delivered - Mark notification as delivered
http.route({
  path: "/api/notifications/mark-delivered",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      
      if (!body.id) {
        return errorResponse("id is required");
      }
      
      await ctx.runMutation(api.notifications.markDelivered, {
        id: body.id,
      });
      
      return jsonResponse({ 
        success: true,
        message: "Notification marked as delivered"
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

// ============ START/FINISH TASK (Simple Endpoints) ============

http.route({
  path: "/api/task/start",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/api/task/finish",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/api/task/get",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

// POST /api/task/start - Agente inicia uma task (by taskNumber or title)
http.route({
  path: "/api/task/start",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      
      if (!body.agentName) {
        return errorResponse("agentName is required");
      }
      
      // Find task by taskNumber, title, or taskId
      let taskId = body.taskId;
      
      if (!taskId && (body.taskNumber || body.title)) {
        const tasks = await ctx.runQuery(api.tasks.list, {});
        const task = tasks.find((t: any) => 
          (body.taskNumber && t.taskNumber === body.taskNumber) ||
          (body.title && t.title.toLowerCase().includes(body.title.toLowerCase()))
        );
        if (task) taskId = task._id;
      }
      
      if (!taskId) {
        return errorResponse("Task not found. Provide taskId, taskNumber, or title");
      }
      
      const result = await ctx.runMutation(api.agents.claimTask, {
        agentName: body.agentName,
        taskId: taskId,
      });
      
      return jsonResponse({ 
        success: true,
        message: `${body.agentName} started task`,
        ...result,
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

// POST /api/task/finish - Agente finaliza uma task
http.route({
  path: "/api/task/finish",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      
      if (!body.agentName) {
        return errorResponse("agentName is required");
      }
      
      // Find task by taskNumber, title, or taskId
      let taskId = body.taskId;
      
      if (!taskId && (body.taskNumber || body.title)) {
        const tasks = await ctx.runQuery(api.tasks.list, {});
        const task = tasks.find((t: any) => 
          (body.taskNumber && t.taskNumber === body.taskNumber) ||
          (body.title && t.title.toLowerCase().includes(body.title.toLowerCase()))
        );
        if (task) taskId = task._id;
      }
      
      // If still no taskId, try to get from agent's currentTaskId
      if (!taskId) {
        const agent = await ctx.runQuery(api.agents.getByName, { name: body.agentName });
        if (agent && agent.currentTaskId) {
          taskId = agent.currentTaskId;
        }
      }
      
      if (!taskId) {
        return errorResponse("Task not found. Provide taskId, taskNumber, title, or agent must have a current task");
      }
      
      const result = await ctx.runMutation(api.agents.completeTask, {
        agentName: body.agentName,
        taskId: taskId,
      });
      
      return jsonResponse({ 
        success: true,
        message: `${body.agentName} completed task`,
        ...result,
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

// GET /api/task/get?number=1 or ?title=xxx - Get task details
http.route({
  path: "/api/task/get",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const taskNumber = url.searchParams.get("number");
      const title = url.searchParams.get("title");
      const id = url.searchParams.get("id");
      
      if (!taskNumber && !title && !id) {
        return errorResponse("Provide number, title, or id query param");
      }
      
      const tasks = await ctx.runQuery(api.tasks.list, {});
      
      let task = null;
      if (id) {
        task = tasks.find((t: any) => t._id === id);
      } else if (taskNumber) {
        task = tasks.find((t: any) => t.taskNumber === parseInt(taskNumber));
      } else if (title) {
        task = tasks.find((t: any) => 
          t.title.toLowerCase().includes(title.toLowerCase())
        );
      }
      
      if (!task) {
        return errorResponse("Task not found", 404);
      }
      
      return jsonResponse({ 
        success: true,
        task,
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

// ============ NOTION SYNC ============

http.route({
  path: "/api/sync/notion",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

// POST /api/sync/notion - Sync from Notion to Convex
http.route({
  path: "/api/sync/notion",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const result = await ctx.runAction(api.sync.syncFromNotion, {});
      
      return jsonResponse({
        success: result.success,
        tasksUpdated: result.tasksUpdated,
        agentsUpdated: result.agentsUpdated,
        errors: result.errors,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

// GET /api/sync/notion - Get last sync time
http.route({
  path: "/api/sync/notion",
  method: "GET",
  handler: httpAction(async (ctx) => {
    try {
      const lastSync = await ctx.runMutation(api.sync.getLastSync, {});
      
      return jsonResponse({
        success: true,
        lastSync,
        lastSyncAgo: lastSync ? `${Math.round((Date.now() - lastSync) / 1000)}s ago` : "never",
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

// ============ HEALTH CHECK ============

http.route({
  path: "/api/health",
  method: "GET",
  handler: httpAction(async () => {
    return jsonResponse({ 
      status: "ok",
      timestamp: Date.now(),
      service: "mission-control-api"
    });
  }),
});

export default http;
