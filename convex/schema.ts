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
});
