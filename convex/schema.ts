import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const role = v.union(v.literal("member"), v.literal("organizer"));
const rsvpStatus = v.union(
  v.literal("yes"),
  v.literal("no"),
  v.literal("maybe"),
);

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(role),
  }).index("email", ["email"]),
  events: defineTable({
    title: v.string(),
    description: v.string(),
    location: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    capacity: v.optional(v.number()),
    createdBy: v.id("users"),
    isCancelled: v.boolean(),
  })
    .index("by_start_time", ["startTime"])
    .index("by_creator", ["createdBy"]),
  rsvps: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
    status: rsvpStatus,
    note: v.optional(v.string()),
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_event_and_user", ["eventId", "userId"]),
});
