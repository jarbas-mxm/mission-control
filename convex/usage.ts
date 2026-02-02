import { query } from "./_generated/server";
import { v } from "convex/values";

// Uso total por agente
export const byAgent = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    const usage = await ctx.db.query("usage").collect();

    const byAgent = agents.map((agent) => {
      const agentUsage = usage.filter((u) => u.agentId === agent._id);
      const totalTokens = agentUsage.reduce(
        (sum, u) => sum + u.inputTokens + u.outputTokens,
        0
      );
      const totalCost = agentUsage.reduce((sum, u) => sum + u.cost, 0);

      return {
        name: agent.name,
        emoji: agent.emoji,
        totalTokens,
        totalCost: totalCost / 100, // Converter para dólares
        requests: agentUsage.length,
      };
    });

    return byAgent.sort((a, b) => b.totalTokens - a.totalTokens);
  },
});

// Uso por período
export const byPeriod = query({
  args: {
    period: v.union(
      v.literal("today"),
      v.literal("week"),
      v.literal("month"),
      v.literal("all")
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const periods: Record<string, number> = {
      today: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      all: Infinity,
    };

    const cutoff = now - periods[args.period];
    const usage = await ctx.db.query("usage").collect();
    const filtered = usage.filter((u) => u.createdAt >= cutoff);

    const totalTokens = filtered.reduce(
      (sum, u) => sum + u.inputTokens + u.outputTokens,
      0
    );
    const totalCost = filtered.reduce((sum, u) => sum + u.cost, 0);

    // Agrupar por modelo
    const byModel: Record<string, { tokens: number; cost: number; count: number }> =
      {};
    filtered.forEach((u) => {
      if (!byModel[u.model]) {
        byModel[u.model] = { tokens: 0, cost: 0, count: 0 };
      }
      byModel[u.model].tokens += u.inputTokens + u.outputTokens;
      byModel[u.model].cost += u.cost;
      byModel[u.model].count += 1;
    });

    return {
      totalTokens,
      totalCost: totalCost / 100,
      requests: filtered.length,
      byModel: Object.entries(byModel).map(([model, data]) => ({
        model,
        tokens: data.tokens,
        cost: data.cost / 100,
        requests: data.count,
      })),
    };
  },
});

// Uso por dia (para gráficos)
export const daily = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const numDays = args.days || 7;
    const now = Date.now();
    const cutoff = now - numDays * 24 * 60 * 60 * 1000;

    const usage = await ctx.db.query("usage").collect();
    const filtered = usage.filter((u) => u.createdAt >= cutoff);

    // Agrupar por dia
    const byDay: Record<string, { tokens: number; cost: number; count: number }> =
      {};

    filtered.forEach((u) => {
      const date = new Date(u.createdAt).toISOString().split("T")[0];
      if (!byDay[date]) {
        byDay[date] = { tokens: 0, cost: 0, count: 0 };
      }
      byDay[date].tokens += u.inputTokens + u.outputTokens;
      byDay[date].cost += u.cost;
      byDay[date].count += 1;
    });

    // Preencher dias vazios
    const result = [];
    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      result.push({
        date,
        tokens: byDay[date]?.tokens || 0,
        cost: (byDay[date]?.cost || 0) / 100,
        requests: byDay[date]?.count || 0,
      });
    }

    return result;
  },
});

// Estatísticas gerais
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const usage = await ctx.db.query("usage").collect();
    const tasks = await ctx.db.query("tasks").collect();
    const agents = await ctx.db.query("agents").collect();

    const completedTasks = tasks.filter((t) => t.status === "done");
    const tasksWithTime = completedTasks.filter((t) => t.actualMinutes);

    const avgCompletionTime =
      tasksWithTime.length > 0
        ? Math.round(
            tasksWithTime.reduce((sum, t) => sum + (t.actualMinutes || 0), 0) /
              tasksWithTime.length
          )
        : 0;

    const totalTokens = usage.reduce(
      (sum, u) => sum + u.inputTokens + u.outputTokens,
      0
    );
    const totalCost = usage.reduce((sum, u) => sum + u.cost, 0);

    return {
      totalAgents: agents.length,
      activeAgents: agents.filter((a) => a.status !== "offline").length,
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      avgCompletionMinutes: avgCompletionTime,
      totalTokens,
      totalCost: totalCost / 100,
      totalRequests: usage.length,
    };
  },
});
