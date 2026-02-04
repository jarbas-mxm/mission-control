import { mutation, action, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";

// Notion API Config - Vai pegar via variável de ambiente
const DB_TASKS = "2fb4442f-c503-81fb-854d-d71423eca3f9";
const DB_AGENTS = "2fb4442f-c503-81ae-b32a-c0f4df3ff062";

// Status mapping Notion → Convex
const STATUS_MAP: Record<string, string> = {
  "Inbox": "inbox",
  "Assigned": "assigned",
  "In Progress": "in_progress",
  "Done": "done",
  "Blocked": "blocked",
};

// Priority mapping Notion → Convex
const PRIORITY_MAP: Record<string, string> = {
  "Alta": "high",
  "Média": "medium",
  "Baixa": "low",
};

// Agent status mapping
const AGENT_STATUS_MAP: Record<string, string> = {
  "Online": "idle",
  "Offline": "offline",
  "Working": "working",
};

interface NotionTask {
  id: string;
  taskNumber: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignee?: string;
  tags?: string[];
}

interface NotionAgent {
  id: string;
  name: string;
  status: string;
  currentTask?: string;
}

// ============ SYNC ACTION ============

// Action que busca dados do Notion via HTTP
export const syncFromNotion = action({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    tasksUpdated: number;
    agentsUpdated: number;
    errors: string[];
  }> => {
    const notionToken = process.env.NOTION_TOKEN;
    
    if (!notionToken) {
      console.error("NOTION_TOKEN not configured");
      return { success: false, tasksUpdated: 0, agentsUpdated: 0, errors: ["NOTION_TOKEN not configured"] };
    }
    
    const errors: string[] = [];
    let tasksUpdated = 0;
    let agentsUpdated = 0;
    
    // Fetch tasks from Notion
    try {
      const tasksResponse = await fetch(
        `https://api.notion.com/v1/databases/${DB_TASKS}/query`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${notionToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sorts: [{ property: "ID", direction: "ascending" }],
          }),
        }
      );
      
      if (!tasksResponse.ok) {
        throw new Error(`Notion API error: ${tasksResponse.status}`);
      }
      
      const tasksData = await tasksResponse.json();
      const notionTasks: NotionTask[] = [];
      
      for (const page of tasksData.results || []) {
        const props = page.properties;
        
        // Parse task number from ID field (e.g., "#014" → 14)
        const idText = props.ID?.rich_text?.[0]?.plain_text || "";
        const taskNumberMatch = idText.match(/#(\d+)/);
        const taskNumber = taskNumberMatch ? parseInt(taskNumberMatch[1], 10) : 0;
        
        if (taskNumber === 0) continue; // Skip tasks without valid ID
        
        notionTasks.push({
          id: page.id,
          taskNumber,
          title: props.Nome?.title?.[0]?.plain_text || "Untitled",
          description: props["Descrição"]?.rich_text?.[0]?.plain_text,
          status: STATUS_MAP[props.Status?.select?.name] || "inbox",
          priority: PRIORITY_MAP[props.Prioridade?.select?.name] || "medium",
          assignee: props["Responsável"]?.select?.name,
          tags: props.Tags?.multi_select?.map((t: any) => t.name) || [],
        });
      }
      
      // Sync tasks to Convex
      const result = await ctx.runMutation(internal.sync.upsertTasks, {
        tasks: notionTasks,
      });
      tasksUpdated = result.updated;
      
    } catch (error: any) {
      console.error("Error fetching tasks from Notion:", error);
      errors.push(`Tasks sync error: ${error.message}`);
    }
    
    // Fetch agents from Notion
    try {
      const agentsResponse = await fetch(
        `https://api.notion.com/v1/databases/${DB_AGENTS}/query`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${notionToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );
      
      if (!agentsResponse.ok) {
        throw new Error(`Notion API error: ${agentsResponse.status}`);
      }
      
      const agentsData = await agentsResponse.json();
      const notionAgents: NotionAgent[] = [];
      
      for (const page of agentsData.results || []) {
        const props = page.properties;
        
        const name = props.Nome?.title?.[0]?.plain_text;
        if (!name) continue;
        
        notionAgents.push({
          id: page.id,
          name,
          status: AGENT_STATUS_MAP[props.Status?.select?.name] || "offline",
          currentTask: props["Tarefa Atual"]?.rich_text?.[0]?.plain_text,
        });
      }
      
      // Sync agents to Convex
      const result = await ctx.runMutation(internal.sync.upsertAgents, {
        agents: notionAgents,
      });
      agentsUpdated = result.updated;
      
    } catch (error: any) {
      console.error("Error fetching agents from Notion:", error);
      errors.push(`Agents sync error: ${error.message}`);
    }
    
    console.log(`Sync complete: ${tasksUpdated} tasks, ${agentsUpdated} agents updated`);
    
    return {
      success: errors.length === 0,
      tasksUpdated,
      agentsUpdated,
      errors,
    };
  },
});

// ============ INTERNAL MUTATIONS ============

// Internal mutation to upsert tasks from Notion data
export const upsertTasks = internalMutation({
  args: {
    tasks: v.array(v.object({
      id: v.string(),
      taskNumber: v.number(),
      title: v.string(),
      description: v.optional(v.string()),
      status: v.string(),
      priority: v.string(),
      assignee: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
    })),
  },
  handler: async (ctx, args) => {
    let updated = 0;
    const now = Date.now();
    
    for (const notionTask of args.tasks) {
      // Find existing task by taskNumber
      const existingTasks = await ctx.db
        .query("tasks")
        .filter((q) => q.eq(q.field("taskNumber"), notionTask.taskNumber))
        .collect();
      
      const existing = existingTasks[0];
      
      // Resolve assignee name to ID
      let assigneeIds: any[] = [];
      if (notionTask.assignee) {
        const agent = await ctx.db
          .query("agents")
          .withIndex("by_name", (q) => q.eq("name", notionTask.assignee!))
          .first();
        if (agent) {
          assigneeIds = [agent._id];
        }
      }
      
      if (existing) {
        // Check if anything changed
        const statusChanged = existing.status !== notionTask.status;
        const titleChanged = existing.title !== notionTask.title;
        const descChanged = existing.description !== notionTask.description;
        const priorityChanged = existing.priority !== notionTask.priority;
        
        if (statusChanged || titleChanged || descChanged || priorityChanged) {
          const updates: any = {
            title: notionTask.title,
            description: notionTask.description,
            status: notionTask.status as any,
            priority: notionTask.priority as any,
            assigneeIds,
            tags: notionTask.tags,
            updatedAt: now,
            notionId: notionTask.id,
          };
          
          // Update lifecycle timestamps
          if (statusChanged) {
            if (notionTask.status === "in_progress" && !existing.startedAt) {
              updates.startedAt = now;
            }
            if (notionTask.status === "done" && !existing.completedAt) {
              updates.completedAt = now;
            }
          }
          
          await ctx.db.patch(existing._id, updates);
          updated++;
        }
      } else {
        // Create new task
        // First, ensure counter is updated
        let counter = await ctx.db
          .query("counters")
          .withIndex("by_name", (q) => q.eq("name", "tasks"))
          .first();
          
        if (counter) {
          if (notionTask.taskNumber > counter.value) {
            await ctx.db.patch(counter._id, { value: notionTask.taskNumber });
          }
        } else {
          await ctx.db.insert("counters", { name: "tasks", value: notionTask.taskNumber });
        }
        
        await ctx.db.insert("tasks", {
          taskNumber: notionTask.taskNumber,
          title: notionTask.title,
          description: notionTask.description,
          status: notionTask.status as any,
          priority: notionTask.priority as any,
          assigneeIds,
          tags: notionTask.tags,
          createdAt: now,
          updatedAt: now,
          notionId: notionTask.id,
        });
        updated++;
      }
    }
    
    return { updated };
  },
});

// Internal mutation to upsert agents from Notion data
export const upsertAgents = internalMutation({
  args: {
    agents: v.array(v.object({
      id: v.string(),
      name: v.string(),
      status: v.string(),
      currentTask: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    let updated = 0;
    const now = Date.now();
    
    for (const notionAgent of args.agents) {
      const existing = await ctx.db
        .query("agents")
        .withIndex("by_name", (q) => q.eq("name", notionAgent.name))
        .first();
      
      if (existing) {
        // Only update if status changed from Notion
        // We respect Notion as source of truth for status
        const notionStatus = notionAgent.status as "idle" | "working" | "offline";
        
        if (existing.status !== notionStatus) {
          await ctx.db.patch(existing._id, {
            status: notionStatus,
            lastSeen: now,
            notionId: notionAgent.id,
          });
          updated++;
        }
      }
      // Don't create new agents from Notion - they should be created in Convex first
    }
    
    return { updated };
  },
});

// ============ SCHEDULED SYNC (called by cron) ============

export const scheduledSync: ReturnType<typeof internalAction> = internalAction({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; tasksUpdated: number; agentsUpdated: number; errors: string[] }> => {
    console.log("🔄 Starting scheduled Notion sync...");
    
    const result = await ctx.runAction(api.sync.syncFromNotion, {});
    
    if (result.success) {
      // Update last sync timestamp
      await ctx.runMutation(internal.sync.setLastSync, {});
      console.log(`✅ Sync complete: ${result.tasksUpdated} tasks, ${result.agentsUpdated} agents`);
    } else {
      console.error("❌ Sync failed:", result.errors);
    }
    
    return result;
  },
});

// ============ LAST SYNC TRACKING ============

export const getLastSync = mutation({
  args: {},
  handler: async (ctx) => {
    const syncRecord = await ctx.db
      .query("counters")
      .withIndex("by_name", (q) => q.eq("name", "lastNotionSync"))
      .first();
    
    return syncRecord?.value || 0;
  },
});

export const setLastSync = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("counters")
      .withIndex("by_name", (q) => q.eq("name", "lastNotionSync"))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, { value: now });
    } else {
      await ctx.db.insert("counters", { name: "lastNotionSync", value: now });
    }
    
    return now;
  },
});
