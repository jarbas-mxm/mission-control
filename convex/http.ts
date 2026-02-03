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
