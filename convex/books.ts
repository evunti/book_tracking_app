import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const add = mutation({
  args: {
    title: v.string(),
    author: v.string(),
    pages: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await getAuthUserId(ctx);
    return await ctx.db.insert("books", args);
  },
});

export const list = query({
  args: {
    sortBy: v.union(
      v.literal("title"),
      v.literal("author"),
      v.literal("rating"),
      v.literal("finished")
    ),
    sortOrder: v.union(v.literal("asc"), v.literal("desc")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    let books = await ctx.db.query("books").collect();

    // Get all ratings and user's ratings in parallel
    const [allRatings, userRatings] = await Promise.all([
      ctx.db.query("ratings").collect(),
      userId
        ? ctx.db
            .query("ratings")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect()
        : [],
    ]);

    // Calculate average ratings
    const avgRatings = new Map();
    for (const book of books) {
      const bookRatings = allRatings.filter((r) => r.bookId === book._id);
      if (bookRatings.length > 0) {
        const avg =
          bookRatings.reduce((acc, curr) => acc + curr.rating, 0) /
          bookRatings.length;
        avgRatings.set(book._id, avg);
      }
    }

    // Get user's finished dates
    const finishedDates = new Map();
    for (const rating of userRatings) {
      if (rating.finishedDate) {
        finishedDates.set(rating.bookId, rating.finishedDate);
      }
    }

    if (args.sortBy === "title") {
      books.sort((a, b) => a.title.localeCompare(b.title));
    } else if (args.sortBy === "author") {
      books.sort((a, b) => a.author.localeCompare(b.author));
    } else if (args.sortBy === "rating") {
      books.sort((a, b) => {
        const ratingA = avgRatings.get(a._id) ?? 0;
        const ratingB = avgRatings.get(b._id) ?? 0;
        return ratingB - ratingA; // Higher ratings first
      });
    } else if (args.sortBy === "finished") {
      books.sort((a, b) => {
        const dateA = finishedDates.get(a._id) ?? "";
        const dateB = finishedDates.get(b._id) ?? "";
        return dateB.localeCompare(dateA); // Recent dates first
      });
    }

    if (args.sortOrder === "desc") {
      books.reverse();
    }

    return books;
  },
});

export const rate = mutation({
  args: {
    bookId: v.id("books"),
    rating: v.number(),
    finishedDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get or create profile
    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) {
      const user = await ctx.db.get(userId);
      if (!user) throw new Error("User not found");
      const profileId = await ctx.db.insert("profiles", {
        userId,
        name: user.name ?? "Anonymous Reader",
      });
      profile = {
        _id: profileId,
        _creationTime: Date.now(),
        userId,
        name: user.name ?? "Anonymous Reader",
      };
    }

    const existing = await ctx.db
      .query("ratings")
      .withIndex("by_book_and_user", (q) =>
        q.eq("bookId", args.bookId).eq("userId", userId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        rating: args.rating,
        finishedDate: args.finishedDate,
        notes: args.notes,
      });
      return existing._id;
    }

    return await ctx.db.insert("ratings", {
      bookId: args.bookId,
      userId,
      profileId: profile._id,
      rating: args.rating,
      finishedDate: args.finishedDate,
      notes: args.notes,
    });
  },
});

export const getRating = query({
  args: {
    bookId: v.id("books"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const rating = await ctx.db
      .query("ratings")
      .withIndex("by_book_and_user", (q) =>
        q.eq("bookId", args.bookId).eq("userId", userId)
      )
      .first();

    return rating
      ? {
          rating: rating.rating,
          finishedDate: rating.finishedDate,
          notes: rating.notes,
        }
      : {
          rating: null,
          finishedDate: null,
          notes: null,
        };
  },
});

export const getAverageRating = query({
  args: {
    bookId: v.id("books"),
  },
  handler: async (ctx, args) => {
    await getAuthUserId(ctx);
    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_book_and_user", (q) => q.eq("bookId", args.bookId))
      .collect();

    if (ratings.length === 0) return null;

    const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
    return sum / ratings.length;
  },
});

export const getBookReviews = query({
  args: {
    bookId: v.id("books"),
  },
  handler: async (ctx, args) => {
    await getAuthUserId(ctx);

    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_book_and_user", (q) => q.eq("bookId", args.bookId))
      .collect();

    const reviews = await Promise.all(
      ratings.map(async (rating) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", rating.userId))
          .unique();

        return {
          ...rating,
          profile,
        };
      })
    );

    return reviews;
  },
});

export const remove = mutation({
  args: {
    bookId: v.id("books"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if the user is an admin
    const isAdmin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!isAdmin) {
      throw new Error("Only admins can remove books");
    }

    // Delete the book
    await ctx.db.delete(args.bookId);
  },
});
