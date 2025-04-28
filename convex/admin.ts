import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    
    const admin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    
    return !!admin;
  },
});

export const makeAdmin = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const requestingUserId = await getAuthUserId(ctx);
    if (!requestingUserId) throw new Error("Not authenticated");
    
    const isRequestingUserAdmin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", requestingUserId))
      .unique();
    
    if (!isRequestingUserAdmin) {
      throw new Error("Only admins can make other users admins");
    }
    
    const targetUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();
    
    if (!targetUser) {
      throw new Error("User not found");
    }
    
    const existingAdmin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", targetUser._id))
      .unique();
    
    if (existingAdmin) {
      throw new Error("User is already an admin");
    }
    
    await ctx.db.insert("admins", {
      userId: targetUser._id,
    });
  },
});

export const deleteBook = mutation({
  args: {
    bookId: v.id("books"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const isAdmin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    
    if (!isAdmin) {
      throw new Error("Only admins can delete books");
    }
    
    // Delete all ratings for this book
    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_book_and_user", (q) => q.eq("bookId", args.bookId))
      .collect();
    
    for (const rating of ratings) {
      await ctx.db.delete(rating._id);
    }
    
    // Delete the book
    await ctx.db.delete(args.bookId);
  },
});
