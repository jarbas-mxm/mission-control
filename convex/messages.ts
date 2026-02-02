import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Criar uma mensagem/comentário em uma task ou chat geral
export const create = mutation({
  args: {
    taskId: v.optional(v.id("tasks")),
    agentName: v.optional(v.string()),
    senderName: v.optional(v.string()), // Para humanos (Marcel, etc)
    content: v.string(),
    attachments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Buscar agente (se for um agente)
    let agent = null;
    const agentName = args.agentName;
    if (agentName) {
      agent = await ctx.db
        .query("agents")
        .withIndex("by_name", (q) => q.eq("name", agentName))
        .first();
    }
    
    // Se não achou agente e não tem senderName, erro
    const senderDisplayName = agent?.name || args.senderName;
    if (!senderDisplayName) throw new Error("Must provide agentName or senderName");
    
    let task = null;
    if (args.taskId) {
      task = await ctx.db.get(args.taskId);
      if (!task) throw new Error("Task not found");
    }
    
    const now = Date.now();
    
    // Criar mensagem
    const messageId = await ctx.db.insert("messages", {
      taskId: args.taskId,
      agentId: agent?._id,
      senderName: args.senderName, // Para humanos
      content: args.content,
      attachments: args.attachments,
      createdAt: now,
    });
    
    // Registrar atividade
    await ctx.db.insert("activities", {
      type: "message_sent",
      agentId: agent?._id,
      taskId: args.taskId,
      message: task 
        ? `${senderDisplayName} comentou em "${task.title}"`
        : `${senderDisplayName} enviou mensagem no chat`,
      createdAt: now,
    });
    
    // Criar notificações para outros envolvidos na task
    // (todos os assignees exceto quem enviou)
    if (task) {
      for (const assigneeId of task.assigneeIds) {
        if (!agent || assigneeId !== agent._id) {
          await ctx.db.insert("notifications", {
            mentionedAgentId: assigneeId,
            fromAgentId: agent?._id,
            taskId: args.taskId,
            content: `${senderDisplayName} comentou: "${args.content.substring(0, 100)}${args.content.length > 100 ? '...' : ''}"`,
            delivered: false,
            createdAt: now,
          });
        }
      }
    }
    
    // Processar @mentions no conteúdo (case-insensitive)
    const mentions = args.content.match(/@(\w+)/g);
    if (mentions) {
      const allAgents = await ctx.db.query("agents").collect();
      
      for (const mention of mentions) {
        const mentionedName = mention.substring(1).toLowerCase(); // Remove @ e lowercase
        const mentionedAgent = allAgents.find(
          (a) => a.name.toLowerCase() === mentionedName
        );
        
        if (mentionedAgent && (!agent || mentionedAgent._id !== agent._id)) {
          await ctx.db.insert("notifications", {
            mentionedAgentId: mentionedAgent._id,
            fromAgentId: agent?._id,
            taskId: args.taskId,
            content: `${senderDisplayName} mencionou você: "${args.content.substring(0, 100)}${args.content.length > 100 ? '...' : ''}"`,
            delivered: false,
            createdAt: now,
          });
        }
      }
    }
    
    return messageId;
  },
});

// Listar mensagens de uma task
export const listByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
    
    // Enriquecer com dados do agente
    const enriched = await Promise.all(
      messages.map(async (msg) => {
        let agentName = msg.senderName;
        let agentEmoji = "👤";
        
        if (msg.agentId) {
          const agent = await ctx.db.get(msg.agentId);
          if (agent) {
            agentName = agent.name;
            agentEmoji = agent.emoji;
          }
        }
        
        return {
          ...msg,
          agentName,
          agentEmoji,
        };
      })
    );
    
    return enriched.sort((a, b) => a.createdAt - b.createdAt);
  },
});

// Listar mensagens do chat geral (sem task)
export const listChat = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const allMessages = await ctx.db.query("messages").collect();
    
    // Filtrar mensagens sem taskId (chat geral)
    const chatMessages = allMessages
      .filter((msg) => !msg.taskId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, args.limit || 50);
    
    // Enriquecer com dados do agente (se tiver)
    const enriched = await Promise.all(
      chatMessages.map(async (msg) => {
        let agentName = msg.senderName; // Humano
        let agentEmoji = "👤"; // Emoji padrão para humanos
        
        if (msg.agentId) {
          const agent = await ctx.db.get(msg.agentId);
          if (agent) {
            agentName = agent.name;
            agentEmoji = agent.emoji;
          }
        }
        
        return {
          ...msg,
          agentName,
          agentEmoji,
        };
      })
    );
    
    return enriched.sort((a, b) => a.createdAt - b.createdAt);
  },
});
