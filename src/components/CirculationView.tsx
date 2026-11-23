import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { downloadCsv } from '../lib/api';
import type { Book, EnrichedBorrowRecord, ReturnStatus, Student } from '../types/library';

interface CirculationViewProps {
  loading: boolean;
  borrows: EnrichedBorrowRecord[];
  students: Student[];
  books: Book[];
  onIssueBook: () => void;
  onEditBorrow: (record: EnrichedBorrowRecord) => void;
  onDeleteBorrow: (record: EnrichedBorrowRecord) => void;
  onToggleStatus: (borrowerId: number, nextStatus: ReturnStatus) => void;
  onInspectStudent: (student: Student) => void;
  onInspectBook: (book: Book) => void;
  onQuickCatalogBook: (bookId: number, titleHint: string) => void;
  onQuickRegisterStudent: (usn: number) => void;
}

export function CirculationView({
  loading,
  borrows,
  students,
  books,
  onIssueBook,
  onEditBorrow,
  onDeleteBorrow,
  onToggleStatus,
  onInspectStudent,
  onInspectBook,
  onQuickCatalogBook,
  onQuickRegisterStudent,
}: CirculationViewProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReturnStatus>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const b of borrows) {
      if (b.student_dept) set.add(b.student_dept);
    }
    return Array.from(set).sort();
  }, [borrows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return borrows.filter((row) => {
      if (statusFilter !== 'all' && row.return_status !== statusFilter) return false;
      if (deptFilter !== 'all' && row.student_dept !== deptFilter) return false;
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
  }, [borrows, query, statusFilter, deptFilter]);

  const studentByUsn = useMemo(() => new Map(students.map((s) => [s.usn, s])), [students]);
  const bookById = useMemo(() => new Map(books.map((b) => [b.book_id, b])), [books]);

  function handleExport() {
    downloadCsv(
      'library-borrow-records.csv',
      [
        'Borrower ID',
        'USN',
        'Student Name',
        'Department',
        'Book ID',
        'Book Name',
        'Author',
        'Borrow Title',
        'Return Status',
      ],
      filtered.map((r) => [
        r.borrower_id,
        r.usn,
        r.student_name ?? 'Unregistered',
        r.student_dept ?? '',
        r.book_id,
        r.book_name ?? 'Uncatalogued',
        r.book_author ?? '',
        r.borrow_title,
        r.return_status,
      ])
    );
  }

  const activeCount = borrows.filter((b) => b.return_status === 'Not Returned').length;
  const returnedCount = borrows.length - activeCount;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Borrow &amp; Circulation Records</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              <span className="font-mono tabular-nums text-slate-700">{borrows.length}</span> total
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-amber-700">{activeCount}</span> not returned
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-emerald-700">{returnedCount}</span> returned
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
              onClick={onIssueBook}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Issue Book
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by Borrower ID, USN, Book ID, title..."
                aria-label="Search borrow records"
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/15"
              />
            </div>

            {departments.length > 0 && (
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                aria-label="Filter by department"
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-1 self-start rounded-lg bg-slate-100 p-1 lg:self-auto">
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
                  {tab === 'all' ? 'All Statuses' : tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-2.5 pl-6 pr-3 whitespace-nowrap">Borrower ID</th>
                <th className="px-3 py-2.5 whitespace-nowrap">USN</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Student &amp; Dept</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Book ID</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Book &amp; Author</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Borrow Title</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Return Status</th>
                <th className="py-2.5 pl-3 pr-6 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="h-11">
                    <td colSpan={8} className="px-6 py-2.5">
                      <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="text-sm font-medium text-slate-900">No borrow records found</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Try clearing your search filter or issue a new book record.
                    </p>
                    <button
                      type="button"
                      onClick={onIssueBook}
                      className="mt-4 rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap"
                    >
                      Issue Book
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const isReturned = row.return_status === 'Returned';
                  const student = studentByUsn.get(row.usn);
                  const book = bookById.get(row.book_id);
                  return (
                    <tr key={row.borrower_id} className="transition-colors hover:bg-slate-50/80">
                      <td className="py-3 pl-6 pr-3 font-mono text-xs font-medium tabular-nums text-slate-900 whitespace-nowrap">
                        {row.borrower_id}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs tabular-nums text-slate-700 whitespace-nowrap">
                        {row.usn}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {student ? (
                          <button
                            type="button"
                            onClick={() => onInspectStudent(student)}
                            className="text-left group"
                          >
                            <span className="font-medium text-slate-900 group-hover:text-blue-700 group-hover:underline">
                              {student.name}
                            </span>
                            <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                            <span className="text-xs text-slate-500">{student.dept}</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>Unregistered</span>
                            <button
                              type="button"
                              onClick={() => onQuickRegisterStudent(row.usn)}
                              className="font-medium text-blue-700 hover:underline whitespace-nowrap"
                            >
                              Register
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs tabular-nums text-slate-700 whitespace-nowrap">
                        {row.book_id}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {book ? (
                          <button
                            type="button"
                            onClick={() => onInspectBook(book)}
                            className="text-left group"
                          >
                            <span className="font-medium text-slate-900 group-hover:text-blue-700 group-hover:underline">
                              {book.book_name}
                            </span>
                            <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                            <span className="text-xs text-slate-500">{book.author}</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>Uncatalogued</span>
                            <button
                              type="button"
                              onClick={() => onQuickCatalogBook(row.book_id, row.borrow_title)}
                              className="font-medium text-blue-700 hover:underline whitespace-nowrap"
                            >
                              Add Book
                            </button>
                          </div>
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
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onToggleStatus(
                                row.borrower_id,
                                isReturned ? 'Not Returned' : 'Returned'
                              )
                            }
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
                          >
                            {isReturned ? 'Reopen' : 'Return'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditBorrow(row)}
                            aria-label={`Edit borrow record ${row.borrower_id}`}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteBorrow(row)}
                            aria-label={`Delete borrow record ${row.borrower_id}`}
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
    </div>
  );
}
