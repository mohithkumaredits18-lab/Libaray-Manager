import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Search,
} from 'lucide-react';
import type {
  Book,
  Department,
  EnrichedBorrowRecord,
  LibraryMetrics,
  ReturnStatus,
  Student,
} from '../types/library';

export type NavTab = 'overview' | 'circulation' | 'books' | 'students' | 'departments';

interface OverviewViewProps {
  loading: boolean;
  metrics: LibraryMetrics;
  borrows: EnrichedBorrowRecord[];
  books: Book[];
  students: Student[];
  departments: Department[];
  onNavigate: (tab: NavTab) => void;
  onToggleBorrowStatus: (borrowerId: number, nextStatus: ReturnStatus) => void;
  onInspectStudent: (student: Student) => void;
  onInspectBook: (book: Book) => void;
  onOpenIssueModal: () => void;
}

export function OverviewView({
  loading,
  metrics,
  borrows,
  books,
  students,
  departments,
  onNavigate,
  onToggleBorrowStatus,
  onInspectStudent,
  onInspectBook,
  onOpenIssueModal,
}: OverviewViewProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | ReturnStatus>('all');
  const [query, setQuery] = useState('');

  const filteredBorrows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return borrows.filter((row) => {
      if (statusFilter !== 'all' && row.return_status !== statusFilter) return false;
      if (!q) return true;
      return (
        String(row.borrower_id).includes(q) ||
        String(row.usn).includes(q) ||
        String(row.book_id).includes(q) ||
        row.borrow_title.toLowerCase().includes(q) ||
        (row.student_name?.toLowerCase().includes(q) ?? false) ||
        (row.student_dept?.toLowerCase().includes(q) ?? false) ||
        (row.book_name?.toLowerCase().includes(q) ?? false) ||
        (row.book_author?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [borrows, statusFilter, query]);

  const deptSummary = useMemo(() => {
    const map = new Map<string, { name: string; hod: string | null; students: number; activeBorrows: number }>();
    for (const d of departments) {
      map.set(d.dept_name.toUpperCase(), {
        name: d.dept_name,
        hod: d.hod,
        students: 0,
        activeBorrows: 0,
      });
    }
    for (const s of students) {
      const key = s.dept.trim().toUpperCase();
      const entry = map.get(key) ?? { name: s.dept, hod: null, students: 0, activeBorrows: 0 };
      entry.students += 1;
      map.set(key, entry);
    }
    for (const b of borrows) {
      if (b.student_dept && b.return_status === 'Not Returned') {
        const key = b.student_dept.trim().toUpperCase();
        const entry = map.get(key);
        if (entry) entry.activeBorrows += 1;
      }
    }
    return Array.from(map.values());
  }, [departments, students, borrows]);

  const studentByUsn = useMemo(() => new Map(students.map((s) => [s.usn, s])), [students]);
  const bookById = useMemo(() => new Map(books.map((b) => [b.book_id, b])), [books]);

  return (
    <div className="space-y-8">
      {/* KPI Strip — Flat single container with hairline vertical dividers */}
      <section aria-label="Library summary metrics" className="rounded-lg border border-slate-200 bg-white">
        <div className="grid grid-cols-2 divide-y divide-slate-200 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
          <div className="px-6 py-5">
            <p className="text-xs font-medium text-slate-500">Catalogued Books</p>
            <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
              {loading ? '—' : metrics.totalBooks}
            </p>
            <p className="mt-1 text-xs text-slate-500">Titles in books table</p>
          </div>
          <div className="px-6 py-5">
            <p className="text-xs font-medium text-slate-500">Registered Students</p>
            <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
              {loading ? '—' : metrics.totalStudents}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Across {metrics.totalDepartments} departments
            </p>
          </div>
          <div className="px-6 py-5">
            <p className="text-xs font-medium text-slate-500">Currently Borrowed</p>
            <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-amber-700">
              {loading ? '—' : metrics.activeBorrows}
            </p>
            <p className="mt-1 text-xs text-slate-500">Awaiting return</p>
          </div>
          <div className="px-6 py-5">
            <p className="text-xs font-medium text-slate-500">Returned Loans</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="font-mono text-2xl font-semibold tabular-nums text-emerald-700">
                {loading ? '—' : metrics.returnedBorrows}
              </p>
              {!loading && (
                <span className="font-mono text-xs tabular-nums text-slate-500">
                  / {metrics.totalBorrows} ({metrics.returnRate}%)
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">Completed circulation</p>
          </div>
        </div>
      </section>

      {/* Primary Focal Anchor: Unified Circulation Ledger (Borrow + Student + Book details together) */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Unified Circulation Ledger</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Combined view of borrower records, student USN &amp; department, and book author details.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('circulation')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 transition-colors hover:text-blue-800 whitespace-nowrap shrink-0"
          >
            Manage all records
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search borrower ID, USN, student, book, author..."
              aria-label="Search circulation ledger"
              className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/15"
            />
          </div>

          <div className="flex items-center gap-1 self-start rounded-lg bg-slate-100 p-1 sm:self-auto">
            {(['all', 'Not Returned', 'Returned'] as const).map((tab) => {
              const active = statusFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab === 'all' ? `All (${borrows.length})` : tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-2.5 pl-6 pr-3 whitespace-nowrap">Borrower ID</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Student (USN · Name · Dept)</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Book (ID · Title · Author)</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Borrow Title</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Return Status</th>
                <th className="py-2.5 pl-3 pr-6 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="h-11">
                    <td colSpan={6} className="px-6 py-2.5">
                      <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : filteredBorrows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <p className="text-sm font-medium text-slate-900">No matching borrow records</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Adjust your filter or issue a new book to add a record.
                    </p>
                    <button
                      type="button"
                      onClick={onOpenIssueModal}
                      className="mt-4 rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap"
                    >
                      Issue Book
                    </button>
                  </td>
                </tr>
              ) : (
                filteredBorrows.map((row) => {
                  const isReturned = row.return_status === 'Returned';
                  const studentObj = studentByUsn.get(row.usn);
                  const bookObj = bookById.get(row.book_id);
                  return (
                    <tr key={row.borrower_id} className="transition-colors hover:bg-slate-50/80">
                      <td className="py-3 pl-6 pr-3 font-mono text-xs font-medium tabular-nums text-slate-900 whitespace-nowrap">
                        #{row.borrower_id}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {studentObj ? (
                          <button
                            type="button"
                            onClick={() => onInspectStudent(studentObj)}
                            className="text-left group"
                          >
                            <span className="font-mono text-xs tabular-nums text-slate-500">
                              USN {row.usn}
                            </span>
                            <span className="mx-1.5 text-slate-300" aria-hidden="true">
                              ·
                            </span>
                            <span className="font-medium text-slate-900 group-hover:text-blue-700 group-hover:underline">
                              {row.student_name}
                            </span>
                            <span className="mx-1.5 text-slate-300" aria-hidden="true">
                              ·
                            </span>
                            <span className="text-xs text-slate-600">{row.student_dept}</span>
                          </button>
                        ) : (
                          <span className="text-slate-500">
                            <span className="font-mono text-xs tabular-nums text-slate-700">
                              USN {row.usn}
                            </span>
                            <span className="mx-1.5 text-slate-300" aria-hidden="true">
                              ·
                            </span>
                            <span className="text-xs">Unregistered</span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {bookObj ? (
                          <button
                            type="button"
                            onClick={() => onInspectBook(bookObj)}
                            className="text-left group"
                          >
                            <span className="font-mono text-xs tabular-nums text-slate-500">
                              #{row.book_id}
                            </span>
                            <span className="mx-1.5 text-slate-300" aria-hidden="true">
                              ·
                            </span>
                            <span className="font-medium text-slate-900 group-hover:text-blue-700 group-hover:underline">
                              {row.book_name}
                            </span>
                            <span className="mx-1.5 text-slate-300" aria-hidden="true">
                              ·
                            </span>
                            <span className="text-xs text-slate-600">{row.book_author}</span>
                          </button>
                        ) : (
                          <span className="text-slate-500">
                            <span className="font-mono text-xs tabular-nums text-slate-700">
                              Book #{row.book_id}
                            </span>
                            <span className="mx-1.5 text-slate-300" aria-hidden="true">
                              ·
                            </span>
                            <span className="text-xs">Uncatalogued</span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-800 whitespace-nowrap">
                        {row.borrow_title}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            isReturned ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {isReturned ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                          )}
                          {row.return_status}
                        </span>
                      </td>
                      <td className="py-3 pl-3 pr-6 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            onToggleBorrowStatus(
                              row.borrower_id,
                              isReturned ? 'Not Returned' : 'Returned'
                            )
                          }
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 whitespace-nowrap"
                        >
                          {isReturned ? 'Reopen' : 'Mark Returned'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Secondary Two-Column Breakdown: Catalog Snapshot + Departments */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Catalog Snapshot */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Book Catalog</h3>
              <p className="mt-0.5 text-xs text-slate-500">Registered titles and authors</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('books')}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap"
            >
              View catalog
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-2 pl-6 pr-3">ID</th>
                  <th className="px-3 py-2">Book Name</th>
                  <th className="px-3 py-2">Author</th>
                  <th className="py-2 pl-3 pr-6 text-right">Loans</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {books.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-6 text-center text-xs text-slate-500">
                      No books catalogued yet.
                    </td>
                  </tr>
                ) : (
                  books.slice(0, 6).map((book) => {
                    const loanCount = borrows.filter((b) => b.book_id === book.book_id).length;
                    return (
                      <tr
                        key={book.book_id}
                        onClick={() => onInspectBook(book)}
                        className="cursor-pointer transition-colors hover:bg-slate-50"
                      >
                        <td className="py-2.5 pl-6 pr-3 font-mono text-xs tabular-nums text-slate-500">
                          #{book.book_id}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-900">{book.book_name}</td>
                        <td className="px-3 py-2.5 text-slate-600">{book.author}</td>
                        <td className="py-2.5 pl-3 pr-6 text-right font-mono text-xs tabular-nums text-slate-700">
                          {loanCount}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Department Summary */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Department Activity</h3>
              <p className="mt-0.5 text-xs text-slate-500">Student enrollment and active loans</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('departments')}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap"
            >
              View departments
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-2 pl-6 pr-3">Department</th>
                  <th className="px-3 py-2">HOD</th>
                  <th className="px-3 py-2 text-right">Students</th>
                  <th className="py-2 pl-3 pr-6 text-right">Active Loans</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {deptSummary.map((item) => (
                  <tr key={item.name} className="transition-colors hover:bg-slate-50">
                    <td className="py-2.5 pl-6 pr-3 font-medium text-slate-900">{item.name}</td>
                    <td className="px-3 py-2.5 text-slate-600">{item.hod ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-slate-700">
                      {item.students}
                    </td>
                    <td className="py-2.5 pl-3 pr-6 text-right font-mono text-xs tabular-nums text-slate-700">
                      {item.activeBorrows}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
