import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const SHARD_COUNT = 128;
const WINDOW_MS = 60_000;
const MAX_PRESSES_PER_WINDOW = 25;
const MIN_PRESS_INTERVAL_MS = 750;
const BLOCK_DURATION_MS = 10 * 60_000;

/** Returns the globally aggregated press count. */
export const getTotal = query({
  args: {},
  returns: v.object({
    total: v.number(),
    shardCount: v.number(),
    activeShards: v.number(),
  }),
  handler: async (ctx) => {
    const shards = await ctx.db.query("counterShards").collect();
    const total = shards.reduce((sum, shard) => sum + shard.count, 0);

    return {
      total,
      shardCount: SHARD_COUNT,
      activeShards: shards.length,
    };
  },
});

/**
 * Increments the global counter with server-side anti-abuse limits.
 */
export const increment = mutation({
  args: {
    clientId: v.string(),
    shardHint: v.optional(v.number()),
  },
  returns: v.object({
    ok: v.boolean(),
    shard: v.number(),
  }),
  handler: async (ctx, args) => {
    const clientId = args.clientId.trim();

    if (clientId.length < 16 || clientId.length > 128) {
      throw new Error("Client identity is invalid.");
    }

    const now = Date.now();

    const clientState = await ctx.db
      .query("botClients")
      .withIndex("by_clientId", (q) => q.eq("clientId", clientId))
      .unique();

    if (!clientState) {
      await ctx.db.insert("botClients", {
        clientId,
        windowStartedAt: now,
        pressesInWindow: 1,
        lastPressAt: now,
      });
    } else {
      if (clientState.blockedUntil && clientState.blockedUntil > now) {
        throw new Error("Rate limited. Please try again later.");
      }

      if (now - clientState.lastPressAt < MIN_PRESS_INTERVAL_MS) {
        await ctx.db.patch(clientState._id, {
          lastPressAt: now,
          blockedUntil: now + BLOCK_DURATION_MS,
        });
        throw new Error("Too many rapid attempts detected.");
      }

      const shouldResetWindow = now - clientState.windowStartedAt >= WINDOW_MS;
      const nextPressCount = shouldResetWindow ? 1 : clientState.pressesInWindow + 1;

      if (nextPressCount > MAX_PRESSES_PER_WINDOW) {
        await ctx.db.patch(clientState._id, {
          lastPressAt: now,
          pressesInWindow: nextPressCount,
          blockedUntil: now + BLOCK_DURATION_MS,
        });
        throw new Error("Rate limited. Please wait before pressing again.");
      }

      await ctx.db.patch(clientState._id, {
        windowStartedAt: shouldResetWindow ? now : clientState.windowStartedAt,
        pressesInWindow: nextPressCount,
        lastPressAt: now,
      });
    }

    const shard =
      args.shardHint === undefined
        ? Math.floor(Math.random() * SHARD_COUNT)
        : Math.max(0, Math.min(SHARD_COUNT - 1, Math.floor(args.shardHint)));

    const existingShard = await ctx.db
      .query("counterShards")
      .withIndex("by_shard", (q) => q.eq("shard", shard))
      .unique();

    if (existingShard) {
      await ctx.db.patch(existingShard._id, {
        count: existingShard.count + 1,
        updatedAt: now,
      });
      return { ok: true, shard };
    }

    await ctx.db.insert("counterShards", {
      shard,
      count: 1,
      updatedAt: now,
    });

    return { ok: true, shard };
  },
});
