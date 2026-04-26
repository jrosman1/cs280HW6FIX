import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation } from "./_generated/server";
import type { FunctionReference } from "convex/server";

declare const process: {
  env: Record<string, string | undefined>;
};

const internalApi = internal as unknown as {
  seed: {
    seedDatabase: FunctionReference<
      "mutation",
      "internal",
      Record<string, never>,
      { created: boolean; reason?: string; events?: number }
    >;
  };
};

export const run = action({
  args: { password: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const expected = process.env.SEED_PASSWORD ?? "chapter-dev";
    if (
      process.env.CONVEX_ENVIRONMENT === "prod" ||
      args.password !== expected
    ) {
      throw new Error("Seed is disabled for this environment.");
    }

    return await ctx.runMutation(internalApi.seed.seedDatabase, {});
  },
});

export const seedDatabase = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("events")
      .withIndex("by_start_time", (q) => q.gte("startTime", Date.now()))
      .filter((q) => q.eq(q.field("isCancelled"), false))
      .take(1);

    if (existing.length > 0) {
      return { created: false, reason: "upcoming events already exist" };
    }

    const organizer = await ctx.db.insert("users", {
      name: "Jordan Organizer",
      email: "organizer@example.com",
      image: "https://github.com/octocat.png",
      role: "organizer",
    });
    const maya = await ctx.db.insert("users", {
      name: "Maya Member",
      email: "maya@example.com",
      image: "https://github.com/github.png",
      role: "member",
    });
    const sam = await ctx.db.insert("users", {
      name: "Sam Member",
      email: "sam@example.com",
      image: "https://github.com/ghost.png",
      role: "member",
    });

    const locations = [
      "Chapter House",
      "Campus Green",
      "Student Union 204",
      "Riverside Pavilion",
      "Downtown Service Center",
    ];
    const titles = [
      "Founders Brunch",
      "Service Night",
      "Study Hall",
      "Alumni Mixer",
      "Big/Little Reveal",
      "Leadership Workshop",
      "Philanthropy Prep",
      "Chapter Dinner",
      "Intramural Tailgate",
      "Exam Care Packages",
    ];

    const now = Date.now();
    const eventIds = [];
    for (let index = 0; index < titles.length; index += 1) {
      const startTime = now + (index + 2) * 3 * 24 * 60 * 60 * 1000;
      eventIds.push(
        await ctx.db.insert("events", {
          title: titles[index],
          description:
            "Chapter members are invited to connect, contribute, and build momentum for the semester.",
          location: locations[index % locations.length],
          startTime,
          endTime: startTime + 2 * 60 * 60 * 1000,
          capacity: index % 3 === 0 ? 24 : undefined,
          createdBy: organizer,
          isCancelled: false,
        }),
      );
    }

    for (let index = 0; index < eventIds.length; index += 1) {
      await ctx.db.insert("rsvps", {
        eventId: eventIds[index],
        userId: maya,
        status: index % 2 === 0 ? "yes" : "maybe",
        note: index % 3 === 0 ? "Can help set up." : undefined,
      });
      await ctx.db.insert("rsvps", {
        eventId: eventIds[index],
        userId: sam,
        status: index % 4 === 0 ? "no" : "yes",
      });
    }

    return { created: true, events: eventIds.length };
  },
});
