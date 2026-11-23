import { useEffect, useState, type FormEvent } from 'react';
import type { Book, BorrowRecord, Department, ReturnStatus, Student } from '../types/library';
import { Modal } from './Modal';

const inputClass =
  'mt-1.5 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20 disabled:bg-slate-50 disabled:text-slate-500';

const labelClass = 'block text-sm font-medium text-slate-700';

// --- Student Form Modal ---

interface StudentModalProps {
  open: boolean;
  initial: Student | null;
  departments: Department[];
  nextUsn: number;
  onClose: () => void;
  onSubmit: (payload: Student, isEdit: boolean) => Promise<void>;
}

export function StudentModal({
  open,
  initial,
  departments,
  nextUsn,
  onClose,
  onSubmit,
}: StudentModalProps) {
  const isEdit = Boolean(initial);
  const [usn, setUsn] = useState('');
  const [name, setName] = useState('');
  const [dept, setDept] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUsn(initial ? String(initial.usn) : String(nextUsn));
    setName(initial?.name ?? '');
    setDept(initial?.dept ?? departments[0]?.dept_name ?? 'CSE');
    setError(null);
    setSaving(false);
  }, [open, initial, nextUsn, departments]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsedUsn = Number(usn.trim());
    if (!Number.isSafeInteger(parsedUsn) || parsedUsn <= 0) {
      setError('USN must be a positive whole number.');
      return;
    }
    if (!name.trim() || name.trim().length > 20) {
      setError('Student name is required (max 20 characters).');
      return;
    }
    if (!dept.trim() || dept.trim().length > 20) {
      setError('Department is required (max 20 characters).');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({ usn: parsedUsn, name: name.trim(), dept: dept.trim() }, isEdit);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save student record.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? `Edit Student #${initial?.usn}` : 'Add Student'}
      description="Maintain student USN, name, and department records."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="student-usn" className={labelClass}>
            USN (Numeric ID)
          </label>
          <input
            id="student-usn"
            type="number"
            min={1}
            step={1}
            required
            disabled={isEdit}
            value={usn}
            onChange={(e) => setUsn(e.target.value)}
            className={`${inputClass} font-mono tabular-nums`}
          />
        </div>

        <div>
          <label htmlFor="student-name" className={labelClass}>
            Student Name
          </label>
          <input
            id="student-name"
            type="text"
            maxLength={20}
            required
            placeholder="e.g. MOHITH"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500">Up to 20 characters to match database schema.</p>
        </div>

        <div>
          <label htmlFor="student-dept" className={labelClass}>
            Department
          </label>
          <input
            id="student-dept"
            type="text"
            list="department-options"
            maxLength={20}
            required
            placeholder="e.g. AIML, CSE, ISE"
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            className={inputClass}
          />
          <datalist id="department-options">
            {departments.map((d) => (
              <option key={d.dept_id} value={d.dept_name} />
            ))}
          </datalist>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Student'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// --- Book Form Modal ---

interface BookModalProps {
  open: boolean;
  initial: Book | null;
  nextBookId: number;
  prefillName?: string;
  onClose: () => void;
  onSubmit: (payload: Book, isEdit: boolean) => Promise<void>;
}

export function BookModal({
  open,
  initial,
  nextBookId,
  prefillName,
  onClose,
  onSubmit,
}: BookModalProps) {
  const isEdit = Boolean(initial);
  const [bookId, setBookId] = useState('');
  const [bookName, setBookName] = useState('');
  const [author, setAuthor] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBookId(initial ? String(initial.book_id) : String(nextBookId));
    setBookName(initial?.book_name ?? prefillName ?? '');
    setAuthor(initial?.author ?? '');
    setError(null);
    setSaving(false);
  }, [open, initial, nextBookId, prefillName]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsedId = Number(bookId.trim());
    if (!Number.isSafeInteger(parsedId) || parsedId <= 0) {
      setError('Book ID must be a positive whole number.');
      return;
    }
    if (!bookName.trim() || bookName.trim().length > 20) {
      setError('Book name is required (max 20 characters).');
      return;
    }
    if (!author.trim() || author.trim().length > 20) {
      setError('Author name is required (max 20 characters).');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(
        { book_id: parsedId, book_name: bookName.trim(), author: author.trim() },
        isEdit
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save book record.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? `Edit Book #${initial?.book_id}` : 'Add Book'}
      description="Register book ID, title, and author details in the library catalog."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="book-id" className={labelClass}>
            Book ID
          </label>
          <input
            id="book-id"
            type="number"
            min={1}
            step={1}
            required
            disabled={isEdit}
            value={bookId}
            onChange={(e) => setBookId(e.target.value)}
            className={`${inputClass} font-mono tabular-nums`}
          />
        </div>

        <div>
          <label htmlFor="book-name" className={labelClass}>
            Book Name
          </label>
          <input
            id="book-name"
            type="text"
            maxLength={20}
            required
            placeholder="e.g. DATA STRUCTURES"
            value={bookName}
            onChange={(e) => setBookName(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500">Up to 20 characters to match database schema.</p>
        </div>

        <div>
          <label htmlFor="book-author" className={labelClass}>
            Author
          </label>
          <input
            id="book-author"
            type="text"
            maxLength={20}
            required
            placeholder="e.g. CORMEN"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Book'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// --- Borrow Form Modal ---

interface BorrowModalProps {
  open: boolean;
  initial: BorrowRecord | null;
  prefillUsn?: number | null;
  prefillBookId?: number | null;
  nextBorrowerId: number;
  students: Student[];
  books: Book[];
  onClose: () => void;
  onSubmit: (payload: BorrowRecord, isEdit: boolean) => Promise<void>;
}

export function BorrowModal({
  open,
  initial,
  prefillUsn,
  prefillBookId,
  nextBorrowerId,
  students,
  books,
  onClose,
  onSubmit,
}: BorrowModalProps) {
  const isEdit = Boolean(initial);
  const [borrowerId, setBorrowerId] = useState('');
  const [usn, setUsn] = useState('');
  const [bookId, setBookId] = useState('');
  const [borrowTitle, setBorrowTitle] = useState('');
  const [returnStatus, setReturnStatus] = useState<ReturnStatus>('Not Returned');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBorrowerId(initial ? String(initial.borrower_id) : String(nextBorrowerId));
    const defaultUsn = initial?.usn ?? prefillUsn ?? students[0]?.usn ?? 1;
    const defaultBook = initial?.book_id ?? prefillBookId ?? books[0]?.book_id ?? 1;
    setUsn(String(defaultUsn));
    setBookId(String(defaultBook));
    if (initial) {
      setBorrowTitle(initial.borrow_title);
    } else {
      const matchedBook = books.find((b) => b.book_id === defaultBook);
      setBorrowTitle(matchedBook ? matchedBook.book_name : '');
    }
    setReturnStatus(initial?.return_status ?? 'Not Returned');
    setError(null);
    setSaving(false);
  }, [open, initial, prefillUsn, prefillBookId, nextBorrowerId, students, books]);

  function handleSelectBook(newBookId: string) {
    setBookId(newBookId);
    const num = Number(newBookId);
    const found = books.find((b) => b.book_id === num);
    if (found && (!borrowTitle.trim() || books.some((b) => b.book_name === borrowTitle.trim()))) {
      setBorrowTitle(found.book_name);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsedBorrower = Number(borrowerId.trim());
    const parsedUsn = Number(usn.trim());
    const parsedBook = Number(bookId.trim());

    if (!Number.isSafeInteger(parsedBorrower) || parsedBorrower <= 0) {
      setError('Borrower ID must be a positive integer.');
      return;
    }
    if (!Number.isSafeInteger(parsedUsn) || parsedUsn <= 0) {
      setError('Student USN must be a positive integer.');
      return;
    }
    if (!Number.isSafeInteger(parsedBook) || parsedBook <= 0) {
      setError('Book ID must be a positive integer.');
      return;
    }
    if (!borrowTitle.trim() || borrowTitle.trim().length > 50) {
      setError('Borrow title is required (max 50 characters).');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(
        {
          borrower_id: parsedBorrower,
          usn: parsedUsn,
          book_id: parsedBook,
          borrow_title: borrowTitle.trim(),
          return_status: returnStatus,
        },
        isEdit
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save borrow record.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? `Edit Borrow Record #${initial?.borrower_id}` : 'Issue Book'}
      description="Link a student USN and book ID with borrow title and return status."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="borrower-id" className={labelClass}>
              Borrower ID
            </label>
            <input
              id="borrower-id"
              type="number"
              min={1}
              step={1}
              required
              disabled={isEdit}
              value={borrowerId}
              onChange={(e) => setBorrowerId(e.target.value)}
              className={`${inputClass} font-mono tabular-nums`}
            />
          </div>

          <div>
            <label htmlFor="borrow-status" className={labelClass}>
              Return Status
            </label>
            <select
              id="borrow-status"
              value={returnStatus}
              onChange={(e) => setReturnStatus(e.target.value as ReturnStatus)}
              className={inputClass}
            >
              <option value="Not Returned">Not Returned</option>
              <option value="Returned">Returned</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="borrow-usn" className={labelClass}>
              Student USN
            </label>
            <input
              id="borrow-usn"
              type="number"
              min={1}
              step={1}
              required
              list="student-usn-options"
              value={usn}
              onChange={(e) => setUsn(e.target.value)}
              className={`${inputClass} font-mono tabular-nums`}
            />
            <datalist id="student-usn-options">
              {students.map((s) => (
                <option key={s.usn} value={s.usn}>
                  {`${s.usn} — ${s.name} (${s.dept})`}
                </option>
              ))}
            </datalist>
            <p className="mt-1 text-xs text-slate-500">
              {students.find((s) => s.usn === Number(usn))
                ? `${students.find((s) => s.usn === Number(usn))?.name} · ${students.find((s) => s.usn === Number(usn))?.dept}`
                : 'Enter registered USN or custom numeric USN'}
            </p>
          </div>

          <div>
            <label htmlFor="borrow-book-id" className={labelClass}>
              Book ID
            </label>
            <input
              id="borrow-book-id"
              type="number"
              min={1}
              step={1}
              required
              list="book-id-options"
              value={bookId}
              onChange={(e) => handleSelectBook(e.target.value)}
              className={`${inputClass} font-mono tabular-nums`}
            />
            <datalist id="book-id-options">
              {books.map((b) => (
                <option key={b.book_id} value={b.book_id}>
                  {`${b.book_id} — ${b.book_name} (${b.author})`}
                </option>
              ))}
            </datalist>
            <p className="mt-1 text-xs text-slate-500">
              {books.find((b) => b.book_id === Number(bookId))
                ? `${books.find((b) => b.book_id === Number(bookId))?.book_name} · ${books.find((b) => b.book_id === Number(bookId))?.author}`
                : 'Enter catalogued Book ID or custom ID'}
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="borrow-title" className={labelClass}>
            Borrow Title
          </label>
          <input
            id="borrow-title"
            type="text"
            maxLength={50}
            required
            placeholder="e.g. Java Programming"
            value={borrowTitle}
            onChange={(e) => setBorrowTitle(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500">Up to 50 characters.</p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Issue Book'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// --- Department Form Modal ---

interface DepartmentModalProps {
  open: boolean;
  initial: Department | null;
  nextDeptId: number;
  onClose: () => void;
  onSubmit: (payload: Department, isEdit: boolean) => Promise<void>;
}

export function DepartmentModal({
  open,
  initial,
  nextDeptId,
  onClose,
  onSubmit,
}: DepartmentModalProps) {
  const isEdit = Boolean(initial);
  const [deptId, setDeptId] = useState('');
  const [deptName, setDeptName] = useState('');
  const [hod, setHod] = useState('');
  const [hodEmail, setHodEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDeptId(initial ? String(initial.dept_id) : String(nextDeptId));
    setDeptName(initial?.dept_name ?? '');
    setHod(initial?.hod ?? '');
    setHodEmail(initial?.hod_email ?? '');
    setError(null);
    setSaving(false);
  }, [open, initial, nextDeptId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsedId = Number(deptId.trim());
    if (!Number.isSafeInteger(parsedId) || parsedId <= 0) {
      setError('Department ID must be a positive integer.');
      return;
    }
    if (!deptName.trim() || deptName.trim().length > 50) {
      setError('Department name is required (max 50 characters).');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(
        {
          dept_id: parsedId,
          dept_name: deptName.trim(),
          hod: hod.trim() || null,
          hod_email: hodEmail.trim() || null,
        },
        isEdit
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save department.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? `Edit Department #${initial?.dept_id}` : 'Add Department'}
      description="Manage department names and head of department contacts."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="dept-id" className={labelClass}>
              Department ID
            </label>
            <input
              id="dept-id"
              type="number"
              min={1}
              step={1}
              required
              disabled={isEdit}
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
              className={`${inputClass} font-mono tabular-nums`}
            />
          </div>
          <div>
            <label htmlFor="dept-name" className={labelClass}>
              Department Code / Name
            </label>
            <input
              id="dept-name"
              type="text"
              maxLength={50}
              required
              placeholder="e.g. AIML"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="dept-hod" className={labelClass}>
            Head of Department (HOD)
          </label>
          <input
            id="dept-hod"
            type="text"
            maxLength={50}
            placeholder="e.g. MAHESH"
            value={hod}
            onChange={(e) => setHod(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="dept-email" className={labelClass}>
            HOD Email
          </label>
          <input
            id="dept-email"
            type="email"
            maxLength={50}
            placeholder="e.g. mahesh@gmail.com"
            value={hodEmail}
            onChange={(e) => setHodEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Department'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
