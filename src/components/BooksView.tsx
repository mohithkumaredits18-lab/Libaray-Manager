import { useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { downloadCsv } from '../lib/api';
import type { Book, EnrichedBorrowRecord } from '../types/library';

interface BooksViewProps {
  loading: boolean;
  books: Book[];
  borrows: EnrichedBorrowRecord[];
  onAddBook: () => void;
  onEditBook: (book: Book) => void;
  onDeleteBook: (book: Book) => void;
  onInspectBook: (book: Book) => void;
  onIssueBook: (bookId: number) => void;
}

export function BooksView({
  loading,
  books,
  borrows,
  onAddBook,
  onEditBook,
  onDeleteBook,
  onInspectBook,
  onIssueBook,
}: BooksViewProps) {
  const [query, setQuery] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'borrowed'>('all');

  const bookStats = useMemo(() => {
    const stats = new Map<number, { total: number; active: EnrichedBorrowRecord | null }>();
    for (const b of books) {
      stats.set(b.book_id, { total: 0, active: null });
    }
    for (const r of borrows) {
      const current = stats.get(r.book_id);
      if (current) {
        current.total += 1;
        if (r.return_status === 'Not Returned' && !current.active) {
          current.active = r;
        }
      }
    }
    return stats;
  }, [books, borrows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books.filter((book) => {
      const st = bookStats.get(book.book_id);
      const isBorrowed = Boolean(st?.active);
      if (availabilityFilter === 'available' && isBorrowed) return false;
      if (availabilityFilter === 'borrowed' && !isBorrowed) return false;
      if (!q) return true;
      return (
        String(book.book_id).includes(q) ||
        book.book_name.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q)
      );
    });
  }, [books, bookStats, query, availabilityFilter]);

  function handleExport() {
    downloadCsv(
      'library-books.csv',
      ['Book ID', 'Book Name', 'Author', 'Total Borrows', 'Current Status'],
      filtered.map((b) => {
        const st = bookStats.get(b.book_id);
        return [
          b.book_id,
          b.book_name,
          b.author,
          st?.total ?? 0,
          st?.active ? `Checked Out (USN ${st.active.usn})` : 'Available',
        ];
      })
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Book Catalog</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            <span className="font-mono tabular-nums text-slate-700">{books.length}</span> books registered with ID, book name, and author details.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={onAddBook}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Book
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Book ID, title, or author..."
            aria-label="Search books"
            className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/15"
          />
        </div>

        <div className="flex items-center gap-1 self-start rounded-lg bg-slate-100 p-1 sm:self-auto">
          {([
            ['all', 'All Books'],
            ['available', 'Available'],
            ['borrowed', 'Checked Out'],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setAvailabilityFilter(val)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                availabilityFilter === val
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
              <th className="py-2.5 pl-6 pr-3 whitespace-nowrap">Book ID</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Book Name</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Author</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Availability</th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap">Total Loans</th>
              <th className="py-2.5 pl-3 pr-6 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx} className="h-11">
                  <td colSpan={6} className="px-6 py-2.5">
                    <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <BookOpen className="mx-auto h-6 w-6 text-slate-400" />
                  <p className="mt-2 text-sm font-medium text-slate-900">No books match your filter</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Add a book title and author to expand the catalog.
                  </p>
                  <button
                    type="button"
                    onClick={onAddBook}
                    className="mt-4 rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap"
                  >
                    Add Book
                  </button>
                </td>
              </tr>
            ) : (
              filtered.map((book) => {
                const st = bookStats.get(book.book_id);
                const activeLoan = st?.active;
                return (
                  <tr key={book.book_id} className="transition-colors hover:bg-slate-50/80">
                    <td className="py-3 pl-6 pr-3 font-mono text-xs font-medium tabular-nums text-slate-700 whitespace-nowrap">
                      #{book.book_id}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onInspectBook(book)}
                        className="font-medium text-slate-900 hover:text-blue-700 hover:underline"
                      >
                        {book.book_name}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{book.author}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {activeLoan ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                          Out to {activeLoan.student_name ?? `USN ${activeLoan.usn}`}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Available
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs tabular-nums text-slate-700 whitespace-nowrap">
                      {st?.total ?? 0}
                    </td>
                    <td className="py-3 pl-3 pr-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onIssueBook(book.book_id)}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
                        >
                          Issue
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditBook(book)}
                          aria-label={`Edit book ${book.book_name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteBook(book)}
                          aria-label={`Delete book ${book.book_name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
