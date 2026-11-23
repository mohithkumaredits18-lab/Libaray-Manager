import { useEffect } from 'react';
import { CheckCircle2, Clock, Plus, X } from 'lucide-react';
import type { Book, Department, EnrichedBorrowRecord, ReturnStatus, Student } from '../types/library';

export type DrawerSelection =
  | { type: 'student'; student: Student }
  | { type: 'book'; book: Book }
  | null;

interface DetailDrawerProps {
  selection: DrawerSelection;
  borrows: EnrichedBorrowRecord[];
  departments: Department[];
  onClose: () => void;
  onIssueForSelection: (prefill: { usn?: number; bookId?: number }) => void;
  onToggleBorrowStatus: (borrowerId: number, nextStatus: ReturnStatus) => void;
}

export function DetailDrawer({
  selection,
  borrows,
  departments,
  onClose,
  onIssueForSelection,
  onToggleBorrowStatus,
}: DetailDrawerProps) {
  useEffect(() => {
    if (!selection) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selection, onClose]);

  if (!selection) return null;

  const isStudent = selection.type === 'student';
  const relatedBorrows = isStudent
    ? borrows.filter((b) => b.usn === selection.student.usn)
    : borrows.filter((b) => b.book_id === selection.book.book_id);

  const matchedDept = isStudent
    ? departments.find(
        (d) => d.dept_name.toLowerCase() === selection.student.dept.trim().toLowerCase()
      )
    : null;

  const activeCount = relatedBorrows.filter((b) => b.return_status === 'Not Returned').length;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-slate-950/30"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">
              {isStudent ? 'Student Record' : 'Catalog Book Record'}
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold text-slate-900">
              {isStudent ? selection.student.name : selection.book.book_name}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isStudent ? (
                <>
                  <span className="font-mono tabular-nums text-slate-700">
                    USN {selection.student.usn}
                  </span>
                  <span className="mx-1.5" aria-hidden="true">
                    ·
                  </span>
                  <span>{selection.student.dept}</span>
                </>
              ) : (
                <>
                  <span className="font-mono tabular-nums text-slate-700">
                    Book #{selection.book.book_id}
                  </span>
                  <span className="mx-1.5" aria-hidden="true">
                    ·
                  </span>
                  <span>Author: {selection.book.author}</span>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details panel"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Summary Attributes */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-b border-slate-200 pb-5 text-sm">
            {isStudent ? (
              <>
                <div>
                  <dt className="text-xs text-slate-500">USN</dt>
                  <dd className="mt-0.5 font-mono font-medium tabular-nums text-slate-900">
                    {selection.student.usn}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Department</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">{selection.student.dept}</dd>
                </div>
                {matchedDept && (
                  <>
                    <div>
                      <dt className="text-xs text-slate-500">Department HOD</dt>
                      <dd className="mt-0.5 text-slate-900">{matchedDept.hod ?? 'Not assigned'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">HOD Email</dt>
                      <dd className="mt-0.5 truncate text-slate-700">
                        {matchedDept.hod_email ?? '—'}
                      </dd>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div>
                  <dt className="text-xs text-slate-500">Book ID</dt>
                  <dd className="mt-0.5 font-mono font-medium tabular-nums text-slate-900">
                    {selection.book.book_id}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Author</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">{selection.book.author}</dd>
                </div>
              </>
            )}
            <div>
              <dt className="text-xs text-slate-500">Total Borrows</dt>
              <dd className="mt-0.5 font-mono font-medium tabular-nums text-slate-900">
                {relatedBorrows.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Currently Out</dt>
              <dd className="mt-0.5 font-mono font-medium tabular-nums text-slate-900">
                {activeCount}
              </dd>
            </div>
          </dl>

          {/* Circulation History */}
          <div className="mt-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Borrow History</h3>
              <button
                type="button"
                onClick={() =>
                  onIssueForSelection(
                    isStudent
                      ? { usn: selection.student.usn }
                      : { bookId: selection.book.book_id }
                  )
                }
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 transition-colors hover:text-blue-800 whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Issue Book
              </button>
            </div>

            {relatedBorrows.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No borrow records linked to this {isStudent ? 'student' : 'book'} yet.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-200 border-t border-slate-200">
                {relatedBorrows.map((record) => {
                  const isReturned = record.return_status === 'Returned';
                  return (
                    <li key={record.borrower_id} className="py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {record.borrow_title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            <span className="font-mono tabular-nums">
                              Borrow #{record.borrower_id}
                            </span>
                            <span className="mx-1.5" aria-hidden="true">
                              ·
                            </span>
                            {isStudent ? (
                              <span>
                                Book #{record.book_id}
                                {record.book_name ? ` (${record.book_name})` : ''}
                              </span>
                            ) : (
                              <span>
                                USN {record.usn}
                                {record.student_name ? ` (${record.student_name})` : ''}
                              </span>
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onToggleBorrowStatus(
                              record.borrower_id,
                              isReturned ? 'Not Returned' : 'Returned'
                            )
                          }
                          className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
                        >
                          {isReturned ? 'Reopen Loan' : 'Mark Returned'}
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
                        {isReturned ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Returned</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-amber-700">Not Returned</span>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
