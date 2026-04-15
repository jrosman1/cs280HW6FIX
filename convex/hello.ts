import { query } from "./_generated/server";

export const greet = query({
  args: {},
  handler: async () => {
    return "Hello from Convex.";
  },
});
