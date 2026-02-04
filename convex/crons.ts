import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Sync from Notion every 2 minutes
crons.interval(
  "sync-notion-tasks",
  { minutes: 2 },
  internal.sync.scheduledSync,
  {},
);

export default crons;
