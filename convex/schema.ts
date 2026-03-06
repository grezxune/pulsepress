import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  counterShards: defineTable({
    shard: v.number(),
    count: v.number(),
    updatedAt: v.number(),
  }).index("by_shard", ["shard"]),
  levelRecords: defineTable({
    scope: v.string(),
    highestLevel: v.number(),
    updatedAt: v.number(),
  }).index("by_scope", ["scope"]),
  levelWinners: defineTable({
    name: v.string(),
    level: v.number(),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
  winnerClaims: defineTable({
    level: v.number(),
    createdAt: v.number(),
    claimed: v.boolean(),
    claimedAt: v.union(v.number(), v.null()),
  }).index("by_claimed", ["claimed"]),
});
