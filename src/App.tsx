import { FormEvent, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { useConvexAuth } from "convex/react";
import { Id } from "../convex/_generated/dataModel";

function StarRating({ rating, onRate }: { rating: number | null, onRate: (rating: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onRate(star)}
          className={`text-2xl ${rating && rating >= star ? "text-yellow-400" : "text-gray-300"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function BookCard({ book }: { book: any }) {
  const { isAuthenticated } = useConvexAuth();
  const userRating = useQuery(api.books.getRating, { bookId: book._id });
  const averageRating = useQuery(api.books.getAverageRating, { bookId: book._id });
  const rate = useMutation(api.books.rate);
  const reviews = useQuery(api.books.getBookReviews, { bookId: book._id }) ?? [];
  const isAdmin = useQuery(api.admin.isAdmin);
  const deleteBook = useMutation(api.admin.deleteBook);

  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(userRating?.notes ?? "");
  const [finishedDate, setFinishedDate] = useState(userRating?.finishedDate ?? "");

  const handleRate = async (rating: number) => {
    await rate({
      bookId: book._id,
      rating,
      notes: notes || undefined,
      finishedDate: finishedDate || undefined,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userRating?.rating) return;
    
    await rate({
      bookId: book._id,
      rating: userRating.rating,
      notes: notes || undefined,
      finishedDate: finishedDate || undefined,
    });
    setIsEditing(false);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold">{book.title}</h3>
          <p className="text-gray-600">by {book.author}</p>
          {book.pages && <p className="text-sm text-gray-500">{book.pages} pages</p>}
        </div>
        {isAdmin && (
          <button
            onClick={() => deleteBook({ bookId: book._id })}
            className="text-red-500 hover:text-red-700"
          >
            Delete
          </button>
        )}
      </div>

      {isAuthenticated && (
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <StarRating rating={userRating?.rating ?? null} onRate={handleRate} />
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              {isEditing ? "Cancel" : "Add Notes"}
            </button>
          </div>

          {isEditing && (
            <form onSubmit={handleSubmit} className="space-y-2">
              <div>
                <label className="block text-sm text-gray-600">Finished Date</label>
                <input
                  type="date"
                  value={finishedDate}
                  onChange={(e) => setFinishedDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Save
              </button>
            </form>
          )}
        </div>
      )}

      <div className="mt-4">
        <p className="text-sm text-gray-600">
          Average Rating: {averageRating ? averageRating.toFixed(1) : "No ratings"}
        </p>
      </div>

      <div className="mt-4 space-y-4">
        <h4 className="font-semibold">Reviews</h4>
        {reviews.map((review) => (
          <div key={review._id} className="border-t pt-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{review.profile?.name}</span>
              <span className="text-yellow-400">{"★".repeat(review.rating)}</span>
              {review.finishedDate && (
                <span className="text-sm text-gray-500">
                  Finished: {new Date(review.finishedDate).toLocaleDateString()}
                </span>
              )}
            </div>
            {review.notes && <p className="text-gray-600 mt-1">{review.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function AddBookForm() {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [pages, setPages] = useState("");
  const addBook = useMutation(api.books.add);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await addBook({
      title,
      author,
      pages: pages ? parseInt(pages) : undefined,
    });
    setTitle("");
    setAuthor("");
    setPages("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-md">
      <div>
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Author</label>
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Pages</label>
        <input
          type="number"
          value={pages}
          onChange={(e) => setPages(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>
      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Add Book
      </button>
    </form>
  );
}

function AdminPanel() {
  const [email, setEmail] = useState("");
  const makeAdmin = useMutation(api.admin.makeAdmin);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await makeAdmin({ email });
      setEmail("");
      alert("Successfully made user an admin");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to make user an admin");
    }
  };

  return (
    <div className="bg-red-50 p-6 rounded-lg shadow-md space-y-4">
      <h2 className="text-xl font-bold text-red-900">Admin Panel</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-red-700">
            Make User Admin (by email)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border-red-300 shadow-sm"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Make Admin
        </button>
      </form>
    </div>
  );
}

export function App() {
  const { isAuthenticated } = useConvexAuth();
  const isAdmin = useQuery(api.admin.isAdmin);
  const [sortBy, setSortBy] = useState<"title" | "author" | "rating" | "finished">("title");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const books = useQuery(api.books.list, { sortBy, sortOrder }) ?? [];

  if (!isAuthenticated) {
    return (
      <main className="container mx-auto p-4">
        <h1 className="text-4xl font-bold mb-8">Book Club</h1>
        <SignInForm />
      </main>
    );
  }

  return (
    <main className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Book Club</h1>
        <SignOutButton />
      </div>

      <div className="space-y-8">
        <AddBookForm />

        {isAdmin && <AdminPanel />}

        <div className="flex gap-4 items-center">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-md border-gray-300 shadow-sm"
          >
            <option value="title">Sort by Title</option>
            <option value="author">Sort by Author</option>
            <option value="rating">Sort by Rating</option>
            <option value="finished">Sort by Finished Date</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="text-gray-600 hover:text-gray-900"
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </button>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <BookCard key={book._id} book={book} />
          ))}
        </div>
      </div>
    </main>
  );
}
