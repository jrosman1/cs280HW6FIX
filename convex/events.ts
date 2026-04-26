import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireEventCreator, requireOrganizer } from "./authHelpers";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

const eventFields = {
  title: v.string(),
  description: v.string(),
  location: v.string(),
  startTime: v.number(),
  endTime: v.number(),
  capacity: v.optional(v.number()),
};

function validateEventTimes(startTime: number, endTime: number) {
  if (endTime <= startTime) {
    throw new Error("End time must be after start time.");
  }
}

async function withOrganizer(ctx: QueryCtx, event: Doc<"events">) {
  const organizer = await ctx.db.get(event.createdBy);

  return {
    ...event,
    organizer: organizer
      ? {
          _id: organizer._id,
          name: organizer.name,
          email: organizer.email,
          image: organizer.image,
        }
      : null,
  };
}

export const listUpcoming = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("events")
      .withIndex("by_start_time", (q) => q.gte("startTime", Date.now()))
      .filter((q) => q.eq(q.field("isCancelled"), false))
      .order("asc")
      .paginate(args.paginationOpts);

    return {
      ...results,
      page: await Promise.all(
        results.page.map((event) => withOrganizer(ctx, event)),
      ),
    };
  },
});

export const listForMonth = query({
  args: {
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    const start = new Date(args.year, args.month, 1).getTime();
    const end = new Date(args.year, args.month + 1, 1).getTime();

    const events = await ctx.db
      .query("events")
      .withIndex("by_start_time", (q) =>
        q.gte("startTime", start).lt("startTime", end),
      )
      .filter((q) => q.eq(q.field("isCancelled"), false))
      .order("asc")
      .collect();

    return await Promise.all(events.map((event) => withOrganizer(ctx, event)));
  },
});

export const getById = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    return event ? await withOrganizer(ctx, event) : null;
  },
});

export const create = mutation({
  args: eventFields,
  handler: async (ctx, args) => {
    const user = await requireOrganizer(ctx);
    validateEventTimes(args.startTime, args.endTime);

    return await ctx.db.insert("events", {
      ...args,
      createdBy: user._id,
      isCancelled: false,
    });
  },
});

export const update = mutation({
  args: {
    eventId: v.id("events"),
    ...eventFields,
  },
  handler: async (ctx, args) => {
    const { eventId, ...patch } = args;
    await requireEventCreator(ctx, eventId);
    validateEventTimes(patch.startTime, patch.endTime);

    await ctx.db.patch(eventId, patch);
  },
});

export const moveToDay = mutation({
  args: {
    eventId: v.id("events"),
    day: v.number(),
  },
  handler: async (ctx, args) => {
    const { event } = await requireEventCreator(ctx, args.eventId);
    const targetDay = new Date(args.day);
    const currentStart = new Date(event.startTime);
    const duration = event.endTime - event.startTime;

    const nextStart = new Date(
      targetDay.getFullYear(),
      targetDay.getMonth(),
      targetDay.getDate(),
      currentStart.getHours(),
      currentStart.getMinutes(),
      currentStart.getSeconds(),
      currentStart.getMilliseconds(),
    ).getTime();
    const nextEnd = nextStart + duration;

    validateEventTimes(nextStart, nextEnd);
    await ctx.db.patch(args.eventId, {
      startTime: nextStart,
      endTime: nextEnd,
    });
  },
});

export const remove = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireEventCreator(ctx, args.eventId);

    const rsvps = await ctx.db
      .query("rsvps")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const rsvp of rsvps) {
      await ctx.db.delete(rsvp._id);
    }

    await ctx.db.delete(args.eventId);
  },
});
