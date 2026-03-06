import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const SHARD_COUNT = 128;
const LEVEL_RECORD_SCOPE = "global";
const MIN_LEVEL = 1;
const MAX_WINNER_NAME_LENGTH = 40;
const WINNER_FEED_LIMIT = 8;

function normalizeWinnerName(input: string): string {
  return input.trim().replace(/\s+/g, " ").slice(0, MAX_WINNER_NAME_LENGTH);
}

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

/** Returns the latest winner submissions for world-record runs. */
export const getLevelWinners = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("levelWinners"),
      _creationTime: v.number(),
      name: v.string(),
      level: v.number(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) =>
    ctx.db
      .query("levelWinners")
      .withIndex("by_createdAt")
      .order("desc")
      .take(WINNER_FEED_LIMIT),
});

/** Updates the global highest level record if a higher level is reached. */
export const reportHighestLevel = mutation({
  args: {
    level: v.number(),
  },
  returns: v.object({
    highestLevel: v.number(),
    updated: v.boolean(),
    claimId: v.union(v.id("winnerClaims"), v.null()),
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
      const claimId = await ctx.db.insert("winnerClaims", {
        level: normalizedLevel,
        createdAt: now,
        claimed: false,
        claimedAt: null,
      });

      return {
        highestLevel: normalizedLevel,
        updated: true,
        claimId,
      };
    }

    if (normalizedLevel > existingRecord.highestLevel) {
      await ctx.db.patch(existingRecord._id, {
        highestLevel: normalizedLevel,
        updatedAt: now,
      });
      const claimId = await ctx.db.insert("winnerClaims", {
        level: normalizedLevel,
        createdAt: now,
        claimed: false,
        claimedAt: null,
      });

      return {
        highestLevel: normalizedLevel,
        updated: true,
        claimId,
      };
    }

    return {
      highestLevel: existingRecord.highestLevel,
      updated: false,
      claimId: null,
    };
  },
});

/** Stores the winner name for a world-record run result. */
export const addLevelWinner = mutation({
  args: {
    claimId: v.id("winnerClaims"),
    name: v.string(),
  },
  returns: v.object({
    saved: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const winnerName = normalizeWinnerName(args.name);
    if (!winnerName) {
      throw new Error("Winner name is required.");
    }

    const claim = await ctx.db.get(args.claimId);
    if (!claim) {
      throw new Error("Winner claim was not found.");
    }

    if (claim.claimed) {
      throw new Error("Winner claim has already been completed.");
    }

    const now = Date.now();
    await ctx.db.insert("levelWinners", {
      name: winnerName,
      level: claim.level,
      createdAt: now,
    });
    await ctx.db.patch(args.claimId, {
      claimed: true,
      claimedAt: now,
    });

    return { saved: true };
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
