import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalAction, internalQuery } from "./_generated/server";
import type { FunctionReference } from "convex/server";

declare const process: {
  env: Record<string, string | undefined>;
};

type Reminder = {
  event: Doc<"events">;
  user: Doc<"users">;
  rsvp: Doc<"rsvps">;
};

const internalApi = internal as unknown as {
  reminders: {
    reminderRecipients: FunctionReference<
      "query",
      "internal",
      { now: number; until: number },
      Reminder[]
    >;
  };
};

export const reminderRecipients = internalQuery({
  args: {
    now: v.number(),
    until: v.number(),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_start_time", (q) =>
        q.gte("startTime", args.now).lt("startTime", args.until),
      )
      .filter((q) => q.eq(q.field("isCancelled"), false))
      .collect();

    const reminders = [];
    for (const event of events) {
      const rsvps = await ctx.db
        .query("rsvps")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .collect();

      for (const rsvp of rsvps) {
        if (rsvp.status === "no") {
          continue;
        }

        const user = await ctx.db.get(rsvp.userId);
        if (user?.email) {
          reminders.push({ event, user, rsvp });
        }
      }
    }

    return reminders;
  },
});

export const sendEventReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const until = now + 24 * 60 * 60 * 1000;
    const reminders = await ctx.runQuery(
      internalApi.reminders.reminderRecipients,
      { now, until },
    );
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.log(`Reminder dry run: ${reminders.length} messages`);
      return { sent: 0, dryRun: reminders.length };
    }

    let sent = 0;
    for (const reminder of reminders) {
      const start = new Date(reminder.event.startTime).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:
            process.env.REMINDER_FROM_EMAIL ??
            "Chapter Events <onboarding@resend.dev>",
          to: reminder.user.email,
          subject: `Reminder: ${reminder.event.title}`,
          text: `${reminder.event.title} starts ${start} at ${reminder.event.location}.`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Resend failed with ${response.status}`);
      }

      sent += 1;
    }

    return { sent, dryRun: 0 };
  },
});
