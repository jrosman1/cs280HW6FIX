import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "send event reminders",
  { hourUTC: 13, minuteUTC: 0 },
  internal.reminders.sendEventReminders,
);

export default crons;
