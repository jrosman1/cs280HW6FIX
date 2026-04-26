import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./authHelpers";

const status = v.union(v.literal("yes"), v.literal("no"), v.literal("maybe"));

export const listForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const rsvps = await ctx.db
      .query("rsvps")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    return await Promise.all(
      rsvps.map(async (rsvp) => ({
        ...rsvp,
        user: await ctx.db.get(rsvp.userId),
      })),
    );
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const rsvps = await ctx.db
      .query("rsvps")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const rows = await Promise.all(
      rsvps.map(async (rsvp) => ({
        ...rsvp,
        event: await ctx.db.get(rsvp.eventId),
      })),
    );

    return rows.sort(
      (a, b) => (a.event?.startTime ?? 0) - (b.event?.startTime ?? 0),
    );
  },
});

export const upsert = mutation({
  args: {
    eventId: v.id("events"),
    status,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event || event.isCancelled) {
      throw new Error("Event is not available for RSVP.");
    }

    if (args.status === "yes" && event.capacity !== undefined) {
      const yesRsvps = await ctx.db
        .query("rsvps")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .filter((q) => q.eq(q.field("status"), "yes"))
        .collect();
      const alreadyYes = yesRsvps.some((rsvp) => rsvp.userId === user._id);
      if (!alreadyYes && yesRsvps.length >= event.capacity) {
        throw new Error("This event is already at capacity.");
      }
    }

    const existing = await ctx.db
      .query("rsvps")
      .withIndex("by_event_and_user", (q) =>
        q.eq("eventId", args.eventId).eq("userId", user._id),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        note: args.note,
      });
      return existing._id;
    }

    return await ctx.db.insert("rsvps", {
      eventId: args.eventId,
      userId: user._id,
      status: args.status,
      note: args.note,
    });
  },
});

export const remove = mutation({
  args: { rsvpId: v.id("rsvps") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const rsvp = await ctx.db.get(args.rsvpId);

    if (!rsvp) {
      return;
    }

    if (rsvp.userId !== user._id) {
      throw new Error("Only the RSVP owner can delete this RSVP.");
    }

    await ctx.db.delete(args.rsvpId);
  },
});
