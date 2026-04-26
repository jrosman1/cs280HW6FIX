import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = QueryCtx | MutationCtx;

export async function getCurrentUserOrThrow(ctx: Ctx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("You must be signed in.");
  }

  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("Signed-in user was not found.");
  }

  return withDefaultRole(user);
}

export function withDefaultRole(user: Doc<"users">) {
  return { ...user, role: user.role ?? "member" };
}

export async function requireOrganizer(ctx: Ctx) {
  const user = await getCurrentUserOrThrow(ctx);
  if (user.role !== "organizer") {
    throw new Error("Organizer access is required.");
  }

  return user;
}

export async function requireEventCreator(ctx: Ctx, eventId: Id<"events">) {
  const user = await requireOrganizer(ctx);
  const event = await ctx.db.get(eventId);

  if (!event) {
    throw new Error("Event not found.");
  }

  if (event.createdBy !== user._id) {
    throw new Error("Only the event creator can manage this event.");
  }

  return { user, event };
}
