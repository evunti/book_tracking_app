import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  books: defineTable({
    title: v.string(),
    author: v.string(),
    pages: v.optional(v.number()),
  }),
  profiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    bio: v.optional(v.string()),
    favoriteGenres: v.optional(v.array(v.string())),
  }).index("by_user", ["userId"]),
  ratings: defineTable({
    bookId: v.id("books"),
    userId: v.id("users"),
    profileId: v.optional(v.id("profiles")), // Make profileId optional
    rating: v.number(),
    notes: v.optional(v.string()),
    finishedDate: v.optional(v.string()),
  })
    .index("by_book_and_user", ["bookId", "userId"])
    .index("by_user", ["userId"])
    .index("by_profile", ["profileId"]),
  admins: defineTable({
    userId: v.id("users"),
  }).index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
