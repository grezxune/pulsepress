import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  counterShards: defineTable({
    shard: v.number(),
    count: v.number(),
    updatedAt: v.number(),
  }).index("by_shard", ["shard"]),
  botClients: defineTable({
    clientId: v.string(),
    windowStartedAt: v.number(),
    pressesInWindow: v.number(),
    lastPressAt: v.number(),
    blockedUntil: v.optional(v.number()),
  }).index("by_clientId", ["clientId"]),
});
