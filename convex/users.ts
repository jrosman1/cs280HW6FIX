import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow, withDefaultRole } from "./authHelpers";

export const me = query({
  args: {},
  handler: async (ctx) => {
    try {
      return await getCurrentUserOrThrow(ctx);
    } catch {
      return null;
    }
  },
});

export const setRoleForDemo = mutation({
  args: {
    role: v.union(v.literal("member"), v.literal("organizer")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await ctx.db.patch(user._id, { role: args.role });
    return withDefaultRole({ ...user, role: args.role });
  },
});
