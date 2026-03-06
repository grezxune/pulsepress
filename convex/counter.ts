import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const SHARD_COUNT = 128;
const LEVEL_RECORD_SCOPE = "global";
const MIN_LEVEL = 1;

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

/** Returns the highest level record reached by any client. */
export const getHighestLevel = query({
  args: {},
  returns: v.object({
    highestLevel: v.number(),
    updatedAt: v.union(v.number(), v.null()),
  }),
  handler: async (ctx) => {
    const record = await ctx.db
      .query("levelRecords")
      .withIndex("by_scope", (q) => q.eq("scope", LEVEL_RECORD_SCOPE))
      .unique();

    return {
      highestLevel: record?.highestLevel ?? MIN_LEVEL,
      updatedAt: record?.updatedAt ?? null,
    };
  },
});

/** Updates the global highest level record if a higher level is reached. */
export const reportHighestLevel = mutation({
  args: {
    level: v.number(),
  },
  returns: v.object({
    highestLevel: v.number(),
    updated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const normalizedLevel = Math.max(MIN_LEVEL, Math.floor(args.level));
    const existingRecord = await ctx.db
      .query("levelRecords")
      .withIndex("by_scope", (q) => q.eq("scope", LEVEL_RECORD_SCOPE))
      .unique();

    if (!existingRecord) {
      await ctx.db.insert("levelRecords", {
        scope: LEVEL_RECORD_SCOPE,
        highestLevel: normalizedLevel,
        updatedAt: now,
      });

      return {
        highestLevel: normalizedLevel,
        updated: true,
      };
    }

    if (normalizedLevel > existingRecord.highestLevel) {
      await ctx.db.patch(existingRecord._id, {
        highestLevel: normalizedLevel,
        updatedAt: now,
      });

      return {
        highestLevel: normalizedLevel,
        updated: true,
      };
    }

    return {
      highestLevel: existingRecord.highestLevel,
      updated: false,
    };
  },
});

/** Increments the global counter. */
export const increment = mutation({
  args: {
    shardHint: v.optional(v.number()),
  },
  returns: v.object({
    ok: v.boolean(),
    shard: v.number(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
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
