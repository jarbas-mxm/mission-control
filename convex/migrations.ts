import { mutation } from "./_generated/server";

// Migration: Assign task numbers to existing tasks
export const assignTaskNumbers = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all tasks ordered by creation date
    const tasks = await ctx.db.query("tasks").order("asc").collect();
    
    // Check existing counter
    let counter = await ctx.db
      .query("counters")
      .withIndex("by_name", (q) => q.eq("name", "tasks"))
      .first();

    let nextNumber = 1;
    
    // Assign numbers to tasks that don't have one
    const tasksToUpdate = tasks.filter(t => !t.taskNumber);
    
    for (const task of tasksToUpdate) {
      await ctx.db.patch(task._id, { taskNumber: nextNumber });
      nextNumber++;
    }
    
    // Find the max taskNumber from all tasks
    const maxNumber = tasks.reduce((max, t) => Math.max(max, t.taskNumber || 0), nextNumber - 1);
    
    // Update or create counter
    if (counter) {
      await ctx.db.patch(counter._id, { value: maxNumber });
    } else {
      await ctx.db.insert("counters", { name: "tasks", value: maxNumber });
    }
    
    return { 
      migrated: tasksToUpdate.length,
      maxTaskNumber: maxNumber
    };
  },
});
