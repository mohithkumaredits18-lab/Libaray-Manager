import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  BookMarked,
  BookOpen,
  Building2,
  Download,
  LayoutDashboard,
  Menu,
  Plus,
  RefreshCw,
  Users,
  X,
} from 'lucide-react';
import { BooksView } from './components/BooksView';
import { CirculationView } from './components/CirculationView';
import { DepartmentsView } from './components/DepartmentsView';
import { DetailDrawer, type DrawerSelection } from './components/DetailDrawer';
import {
  BookModal,
  BorrowModal,
  DepartmentModal,
  StudentModal,
} from './components/LibraryModals';
import { ConfirmDialog } from './components/Modal';
import { OverviewView, type NavTab } from './components/OverviewView';
import { StudentsView } from './components/StudentsView';
import {
  createBookApi,
  createBorrowApi,
  createDepartmentApi,
  createStudentApi,
  deleteBookApi,
  deleteBorrowApi,
  deleteDepartmentApi,
  deleteStudentApi,
  downloadCsv,
  fetchLibrarySnapshot,
  toggleBorrowStatusApi,
  updateBookApi,
  updateBorrowApi,
  updateDepartmentApi,
  updateStudentApi,
} from './lib/api';
import type {
  Book,
  BorrowRecord,
  Department,
  EnrichedBorrowRecord,
  LibraryMetrics,
  LibrarySnapshot,
  ReturnStatus,
  Student,
  StudentTableKey,
} from './types/library';

const EMPTY_METRICS: LibraryMetrics = {
  totalBooks: 0,
  totalStudents: 0,
  totalBorrows: 0,
  activeBorrows: 0,
  returnedBorrows: 0,
  totalDepartments: 0,
  returnRate: 0,
};

const TAB_META: Record<NavTab, { label: string; ctaLabel: string }> = {
  overview: { label: 'Overview', ctaLabel: 'Issue Book' },
  circulation: { label: 'Circulation', ctaLabel: 'Issue Book' },
  books: { label: 'Books', ctaLabel: 'Add Book' },
  students: { label: 'Students', ctaLabel: 'Add Student' },
  departments: { label: 'Departments', ctaLabel: 'Add Department' },
};

type DeleteTarget =
  | { kind: 'student'; item: Student }
  | { kind: 'book'; item: Book }
  | { kind: 'borrow'; item: EnrichedBorrowRecord }
  | { kind: 'department'; item: Department }
  | null;

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [studentTable, setStudentTable] = useState<StudentTableKey>('students17');

  const [snapshot, setSnapshot] = useState<LibrarySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: 'info' | 'error' } | null>(null);

  // Modal & Drawer state
  const [drawerSelection, setDrawerSelection] = useState<DrawerSelection>(null);
  const [studentModal, setStudentModal] = useState<{ open: boolean; initial: Student | null; prefillUsn?: number }>({
    open: false,
    initial: null,
  });
  const [bookModal, setBookModal] = useState<{ open: boolean; initial: Book | null; prefillBook?: Book }>({
    open: false,
    initial: null,
  });
  const [borrowModal, setBorrowModal] = useState<{
    open: boolean;
    initial: BorrowRecord | null;
    prefillUsn?: number | null;
    prefillBookId?: number | null;
  }>({ open: false, initial: null });
  const [deptModal, setDeptModal] = useState<{ open: boolean; initial: Department | null }>({
    open: false,
    initial: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const showToast = useCallback((text: string, tone: 'info' | 'error' = 'info') => {
    setToast({ text, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const loadData = useCallback(
    async (table: StudentTableKey, silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setLoadError(null);
      try {
        const data = await fetchLibrarySnapshot(table);
        setSnapshot(data);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Unable to load library records.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadData(studentTable);
  }, [studentTable, loadData]);

  const students = snapshot?.students ?? [];
  const books = snapshot?.books ?? [];
  const borrows = snapshot?.borrows ?? [];
  const departments = snapshot?.departments ?? [];
  const metrics = snapshot?.metrics ?? EMPTY_METRICS;

  // Keep open drawer in sync after edits/refreshes
  useEffect(() => {
    if (!drawerSelection || !snapshot) return;
    if (drawerSelection.type === 'student') {
      const updated = snapshot.students.find((s) => s.usn === drawerSelection.student.usn);
      if (!updated) setDrawerSelection(null);
      else if (updated !== drawerSelection.student) {
        setDrawerSelection({ type: 'student', student: updated });
      }
    } else {
      const updated = snapshot.books.find((b) => b.book_id === drawerSelection.book.book_id);
      if (!updated) setDrawerSelection(null);
      else if (updated !== drawerSelection.book) {
        setDrawerSelection({ type: 'book', book: updated });
      }
    }
  }, [snapshot, drawerSelection]);

  const nextIds = useMemo(() => {
    const maxUsn = students.reduce((acc, s) => Math.max(acc, s.usn), 0);
    const maxBook = books.reduce((acc, b) => Math.max(acc, b.book_id), 0);
    const maxBorrow = borrows.reduce((acc, r) => Math.max(acc, r.borrower_id), 100);
    const maxDept = departments.reduce((acc, d) => Math.max(acc, d.dept_id), 0);
    return {
      usn: maxUsn + 1,
      bookId: maxBook + 1,
      borrowerId: maxBorrow + 1,
      deptId: maxDept + 1,
    };
  }, [students, books, borrows, departments]);

  // --- Mutation Handlers ---

  async function handleSaveStudent(payload: Student, isEdit: boolean) {
    if (isEdit) {
      await updateStudentApi(studentTable, payload.usn, { name: payload.name, dept: payload.dept });
      showToast(`Updated student ${payload.name} (USN ${payload.usn}).`);
    } else {
      await createStudentApi(studentTable, payload);
      showToast(`Registered student ${payload.name} (USN ${payload.usn}).`);
    }
    await loadData(studentTable, true);
  }

  async function handleSaveBook(payload: Book, isEdit: boolean) {
    if (isEdit) {
      await updateBookApi(payload.book_id, { book_name: payload.book_name, author: payload.author });
      showToast(`Updated book "${payload.book_name}".`);
    } else {
      await createBookApi(payload);
      showToast(`Added book "${payload.book_name}" to catalog.`);
    }
    await loadData(studentTable, true);
  }

  async function handleSaveBorrow(payload: BorrowRecord, isEdit: boolean) {
    if (isEdit) {
      await updateBorrowApi(payload.borrower_id, {
        usn: payload.usn,
        book_id: payload.book_id,
        borrow_title: payload.borrow_title,
        return_status: payload.return_status,
      });
      showToast(`Updated borrow record #${payload.borrower_id}.`);
    } else {
      await createBorrowApi(payload);
      showToast(`Issued "${payload.borrow_title}" (Borrow #${payload.borrower_id}).`);
    }
    await loadData(studentTable, true);
  }

  async function handleToggleBorrowStatus(borrowerId: number, nextStatus: ReturnStatus) {
    try {
      await toggleBorrowStatusApi(borrowerId, nextStatus);
      showToast(`Borrow #${borrowerId} marked as ${nextStatus}.`);
      await loadData(studentTable, true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update return status.', 'error');
    }
  }

  async function handleSaveDepartment(payload: Department, isEdit: boolean) {
    if (isEdit) {
      await updateDepartmentApi(payload.dept_id, {
        dept_name: payload.dept_name,
        hod: payload.hod,
        hod_email: payload.hod_email,
      });
      showToast(`Updated department ${payload.dept_name}.`);
    } else {
      await createDepartmentApi(payload);
      showToast(`Added department ${payload.dept_name}.`);
    }
    await loadData(studentTable, true);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      if (deleteTarget.kind === 'student') {
        await deleteStudentApi(studentTable, deleteTarget.item.usn);
        showToast(`Removed student ${deleteTarget.item.name}.`);
      } else if (deleteTarget.kind === 'book') {
        await deleteBookApi(deleteTarget.item.book_id);
        showToast(`Removed book "${deleteTarget.item.book_name}".`);
      } else if (deleteTarget.kind === 'borrow') {
        await deleteBorrowApi(deleteTarget.item.borrower_id);
        showToast(`Deleted borrow record #${deleteTarget.item.borrower_id}.`);
      } else if (deleteTarget.kind === 'department') {
        await deleteDepartmentApi(deleteTarget.item.dept_id);
        showToast(`Removed department ${deleteTarget.item.dept_name}.`);
      }
      setDeleteTarget(null);
      await loadData(studentTable, true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete record.', 'error');
    } finally {
      setDeleteBusy(false);
    }
  }

  function handlePrimaryAction() {
    if (activeTab === 'books') {
      setBookModal({ open: true, initial: null });
    } else if (activeTab === 'students') {
      setStudentModal({ open: true, initial: null });
    } else if (activeTab === 'departments') {
      setDeptModal({ open: true, initial: null });
    } else {
      setBorrowModal({ open: true, initial: null });
    }
  }

  function handleExportAllCsv() {
    downloadCsv(
      'folio-complete-circulation-report.csv',
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
      borrows.map((b) => [
        b.borrower_id,
        b.usn,
        b.student_name ?? '',
        b.student_dept ?? '',
        b.book_id,
        b.book_name ?? '',
        b.book_author ?? '',
        b.borrow_title,
        b.return_status,
      ])
    );
    showToast('Exported complete circulation CSV report.');
  }

  const navItems: Array<{ id: NavTab; label: string; count?: number; icon: typeof LayoutDashboard }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'circulation', label: 'Circulation', count: borrows.length, icon: ArrowLeftRight },
    { id: 'books', label: 'Books', count: books.length, icon: BookOpen },
    { id: 'students', label: 'Students', count: students.length, icon: Users },
    { id: 'departments', label: 'Departments', count: departments.length, icon: Building2 },
  ];

  const deleteMessage = useMemo(() => {
    if (!deleteTarget) return '';
    if (deleteTarget.kind === 'student') {
      return `Remove student ${deleteTarget.item.name} (USN ${deleteTarget.item.usn}) from ${studentTable}? Existing borrow history rows will retain the USN number.`;
    }
    if (deleteTarget.kind === 'book') {
      return `Remove "${deleteTarget.item.book_name}" by ${deleteTarget.item.author} (Book #${deleteTarget.item.book_id}) from the catalog?`;
    }
    if (deleteTarget.kind === 'borrow') {
      return `Permanently delete borrow record #${deleteTarget.item.borrower_id} ("${deleteTarget.item.borrow_title}")?`;
    }
    return `Remove department ${deleteTarget.item.dept_name} (ID #${deleteTarget.item.dept_id})?`;
  }, [deleteTarget, studentTable]);

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white">
      {/* Brand Wordmark */}
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-5">
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('overview');
            setMobileNavOpen(false);
          }}
          className="inline-flex items-center gap-2.5 text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-700 text-white">
            <BookMarked className="h-4 w-4" />
          </span>
          Folio
        </a>
        <button
          type="button"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close navigation menu"
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Primary navigation" className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                setMobileNavOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-blue-50 text-blue-800'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-blue-700' : 'text-slate-400'}`} />
                {item.label}
              </span>
              {typeof item.count === 'number' && !loading && (
                <span
                  className={`font-mono text-xs tabular-nums ${
                    active ? 'text-blue-700' : 'text-slate-400'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quiet Utility Footer */}
      <div className="border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={handleExportAllCsv}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
        >
          <Download className="h-3.5 w-3.5 text-slate-500" />
          Export Full Report
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Fixed Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-slate-200 bg-white lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Sidebar */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 flex bg-slate-950/35 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        >
          <aside
            className="w-64 border-r border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex min-h-screen flex-col lg:pl-60">
        {/* Top Bar Contract: Breadcrumb on left, Primary action on right */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm whitespace-nowrap">
              <span className="text-slate-500">Library</span>
              <span className="text-slate-300" aria-hidden="true">/</span>
              <span className="font-semibold text-slate-900">{TAB_META[activeTab].label}</span>
            </nav>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => loadData(studentTable, true)}
              disabled={refreshing}
              aria-label="Refresh library records"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-700 px-4 text-xs font-medium text-white transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              {TAB_META[activeTab].ctaLabel}
            </button>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {/* Calm configuration notice if DATABASE_URL secret hasn't been added yet */}
          {snapshot?.source === 'preview' && !bannerDismissed && (
            <div className="mb-6 flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              <p className="leading-relaxed">
                Showing a synced preview of your library tables. To save changes live to your
                PostgreSQL database, add <span className="font-mono text-xs text-slate-900">DATABASE_URL</span> in{' '}
                <strong className="font-medium text-slate-900">Settings → Secrets</strong>.
              </p>
              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                aria-label="Dismiss notice"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Error Banner */}
          {loadError && (
            <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <span>{loadError}</span>
              <button
                type="button"
                onClick={() => loadData(studentTable)}
                className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 whitespace-nowrap shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {activeTab === 'overview' && (
            <OverviewView
              loading={loading}
              metrics={metrics}
              borrows={borrows}
              books={books}
              students={students}
              departments={departments}
              onNavigate={setActiveTab}
              onToggleBorrowStatus={handleToggleBorrowStatus}
              onInspectStudent={(student) => setDrawerSelection({ type: 'student', student })}
              onInspectBook={(book) => setDrawerSelection({ type: 'book', book })}
              onOpenIssueModal={() => setBorrowModal({ open: true, initial: null })}
            />
          )}

          {activeTab === 'circulation' && (
            <CirculationView
              loading={loading}
              borrows={borrows}
              students={students}
              books={books}
              onIssueBook={() => setBorrowModal({ open: true, initial: null })}
              onEditBorrow={(record) => setBorrowModal({ open: true, initial: record })}
              onDeleteBorrow={(record) => setDeleteTarget({ kind: 'borrow', item: record })}
              onToggleStatus={handleToggleBorrowStatus}
              onInspectStudent={(student) => setDrawerSelection({ type: 'student', student })}
              onInspectBook={(book) => setDrawerSelection({ type: 'book', book })}
              onQuickCatalogBook={(bookId, titleHint) =>
                setBookModal({
                  open: true,
                  initial: null,
                  prefillBook: {
                    book_id: bookId,
                    book_name: titleHint.slice(0, 20),
                    author: '',
                  },
                })
              }
              onQuickRegisterStudent={(usn) =>
                setStudentModal({
                  open: true,
                  initial: null,
                  prefillUsn: usn,
                })
              }
            />
          )}

          {activeTab === 'books' && (
            <BooksView
              loading={loading}
              books={books}
              borrows={borrows}
              onAddBook={() => setBookModal({ open: true, initial: null })}
              onEditBook={(book) => setBookModal({ open: true, initial: book })}
              onDeleteBook={(book) => setDeleteTarget({ kind: 'book', item: book })}
              onInspectBook={(book) => setDrawerSelection({ type: 'book', book })}
              onIssueBook={(bookId) =>
                setBorrowModal({ open: true, initial: null, prefillBookId: bookId })
              }
            />
          )}

          {activeTab === 'students' && (
            <StudentsView
              loading={loading}
              studentTable={studentTable}
              onChangeStudentTable={(tbl) => setStudentTable(tbl)}
              students={students}
              borrows={borrows}
              departments={departments}
              onAddStudent={() => setStudentModal({ open: true, initial: null })}
              onEditStudent={(student) => setStudentModal({ open: true, initial: student })}
              onDeleteStudent={(student) => setDeleteTarget({ kind: 'student', item: student })}
              onInspectStudent={(student) => setDrawerSelection({ type: 'student', student })}
              onIssueForStudent={(usn) =>
                setBorrowModal({ open: true, initial: null, prefillUsn: usn })
              }
            />
          )}

          {activeTab === 'departments' && (
            <DepartmentsView
              loading={loading}
              departments={departments}
              students={students}
              borrows={borrows}
              onAddDepartment={() => setDeptModal({ open: true, initial: null })}
              onEditDepartment={(dept) => setDeptModal({ open: true, initial: dept })}
              onDeleteDepartment={(dept) => setDeleteTarget({ kind: 'department', item: dept })}
            />
          )}
        </main>
      </div>

      {/* Slide-Over Detail Inspector */}
      <DetailDrawer
        selection={drawerSelection}
        borrows={borrows}
        departments={departments}
        onClose={() => setDrawerSelection(null)}
        onIssueForSelection={({ usn, bookId }) =>
          setBorrowModal({
            open: true,
            initial: null,
            prefillUsn: usn ?? null,
            prefillBookId: bookId ?? null,
          })
        }
        onToggleBorrowStatus={handleToggleBorrowStatus}
      />

      {/* CRUD Form Modals */}
      <StudentModal
        open={studentModal.open}
        initial={studentModal.initial}
        departments={departments}
        nextUsn={studentModal.prefillUsn ?? nextIds.usn}
        onClose={() => setStudentModal({ open: false, initial: null })}
        onSubmit={handleSaveStudent}
      />

      <BookModal
        open={bookModal.open}
        initial={bookModal.initial}
        nextBookId={bookModal.prefillBook?.book_id ?? nextIds.bookId}
        prefillName={bookModal.prefillBook?.book_name}
        onClose={() => setBookModal({ open: false, initial: null })}
        onSubmit={handleSaveBook}
      />

      <BorrowModal
        open={borrowModal.open}
        initial={borrowModal.initial}
        prefillUsn={borrowModal.prefillUsn}
        prefillBookId={borrowModal.prefillBookId}
        nextBorrowerId={nextIds.borrowerId}
        students={students}
        books={books}
        onClose={() => setBorrowModal({ open: false, initial: null })}
        onSubmit={handleSaveBorrow}
      />

      <DepartmentModal
        open={deptModal.open}
        initial={deptModal.initial}
        nextDeptId={nextIds.deptId}
        onClose={() => setDeptModal({ open: false, initial: null })}
        onSubmit={handleSaveDepartment}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Confirm Removal"
        message={deleteMessage}
        confirmLabel="Remove"
        busy={deleteBusy}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Toast Feedback */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${
            toast.tone === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-slate-200 bg-slate-900 text-white'
          }`}
        >
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="opacity-70 transition-opacity hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
