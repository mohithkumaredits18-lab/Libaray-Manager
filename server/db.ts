import pg from 'pg';
import type {
  Book,
  BorrowRecord,
  Department,
  EnrichedBorrowRecord,
  LibrarySnapshot,
  ReturnStatus,
  Student,
  StudentTableKey,
} from '../src/types/library.ts';

const { Pool } = pg;

const STUDENT_TABLE_SQL: Record<StudentTableKey, string> = {
  students17: '"public"."students17"',
  students18: '"public"."students18"',
};

export function resolveStudentTable(input: unknown): StudentTableKey {
  if (input === 'students18') return 'students18';
  return 'students17';
}

// Initial preview dataset matching the existing PostgreSQL tables so the UI
// remains immediately interactive before DATABASE_URL is configured in Secrets.
const previewState: {
  students17: Student[];
  students18: Student[];
  books: Book[];
  borrow: BorrowRecord[];
  department: Department[];
} = {
  students17: [
    { usn: 1, name: 'MOHITH', dept: 'AIML' },
    { usn: 2, name: 'DEV', dept: 'ISE' },
    { usn: 3, name: 'YASH', dept: 'CSE' },
  ],
  students18: [
    { usn: 1, name: 'RAJ', dept: 'CSE' },
    { usn: 2, name: 'DEV', dept: 'ISE' },
    { usn: 3, name: 'AJAY', dept: 'CSE' },
    { usn: 4, name: 'MOHITH', dept: 'AIML' },
  ],
  books: [
    { book_id: 1, book_name: 'JAVA', author: 'JAMES' },
    { book_id: 2, book_name: 'PYTHON', author: 'GUIDO' },
    { book_id: 3, book_name: 'DBMS', author: 'KORTH' },
  ],
  borrow: [
    { borrower_id: 101, usn: 1, book_id: 1, borrow_title: 'Java Programming', return_status: 'Returned' },
    { borrower_id: 102, usn: 2, book_id: 2, borrow_title: 'Python Basics', return_status: 'Not Returned' },
    { borrower_id: 103, usn: 3, book_id: 3, borrow_title: 'DBMS Concepts', return_status: 'Returned' },
    { borrower_id: 104, usn: 4, book_id: 4, borrow_title: 'Data Structures', return_status: 'Not Returned' },
    { borrower_id: 105, usn: 5, book_id: 5, borrow_title: 'Operating Systems', return_status: 'Returned' },
    { borrower_id: 106, usn: 6, book_id: 6, borrow_title: 'Computer Networks', return_status: 'Not Returned' },
    { borrower_id: 107, usn: 7, book_id: 7, borrow_title: 'Artificial Intelligence', return_status: 'Returned' },
    { borrower_id: 108, usn: 8, book_id: 8, borrow_title: 'Machine Learning', return_status: 'Not Returned' },
  ],
  department: [
    { dept_id: 1, dept_name: 'CSE', hod: 'RAMESH', hod_email: 'ramesh@gmail.com' },
    { dept_id: 2, dept_name: 'ECE', hod: 'SURESH', hod_email: 'suresh@gmail.com' },
    { dept_id: 3, dept_name: 'AIML', hod: 'MAHESH', hod_email: 'mahesh@gmail.com' },
    { dept_id: 4, dept_name: 'ISE', hod: 'RAJESH', hod_email: 'rajesh@gmail.com' },
    { dept_id: 5, dept_name: 'MECH', hod: 'GANESH', hod_email: 'ganesh@gmail.com' },
  ],
};

let pool: pg.Pool | null = null;
let dbAvailable = false;

function buildPoolConfig(rawUrl: string): pg.PoolConfig {
  const parsed = new URL(rawUrl);
  const sslMode = parsed.searchParams.get('sslmode');
  parsed.searchParams.delete('sslmode');

  const requiresSsl =
    sslMode !== 'disable' &&
    parsed.hostname !== 'localhost' &&
    parsed.hostname !== '127.0.0.1';

  const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true';

  return {
    connectionString: parsed.toString(),
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
    ssl: requiresSsl
      ? {
          rejectUnauthorized,
          ...(process.env.DATABASE_CA_CERT ? { ca: process.env.DATABASE_CA_CERT } : {}),
        }
      : undefined,
  };
}

export async function initDatabase(): Promise<{ source: 'postgres' | 'preview' }> {
  const rawUrl = process.env.DATABASE_URL?.trim();
  if (!rawUrl) {
    dbAvailable = false;
    return { source: 'preview' };
  }

  try {
    pool = new Pool(buildPoolConfig(rawUrl));
    pool.on('error', () => {
      // Prevent unhandled idle client errors from crashing the server process
    });
    await pool.query('SELECT 1');
    dbAvailable = true;
    return { source: 'postgres' };
  } catch {
    dbAvailable = false;
    if (pool) {
      await pool.end().catch(() => {});
      pool = null;
    }
    return { source: 'preview' };
  }
}

export function getDataSource(): 'postgres' | 'preview' {
  return dbAvailable && pool ? 'postgres' : 'preview';
}

function normalizeReturnStatus(raw: string | null | undefined): ReturnStatus {
  return raw?.trim().toLowerCase() === 'returned' ? 'Returned' : 'Not Returned';
}

function enrichBorrows(
  borrows: BorrowRecord[],
  students: Student[],
  books: Book[]
): EnrichedBorrowRecord[] {
  const studentMap = new Map<number, Student>();
  for (const s of students) studentMap.set(Number(s.usn), s);

  const bookMap = new Map<number, Book>();
  for (const b of books) bookMap.set(Number(b.book_id), b);

  return borrows.map((row) => {
    const st = studentMap.get(Number(row.usn));
    const bk = bookMap.get(Number(row.book_id));
    return {
      borrower_id: Number(row.borrower_id),
      usn: Number(row.usn),
      book_id: Number(row.book_id),
      borrow_title: row.borrow_title ?? '',
      return_status: normalizeReturnStatus(row.return_status),
      student_name: st?.name ?? null,
      student_dept: st?.dept ?? null,
      book_name: bk?.book_name ?? null,
      book_author: bk?.author ?? null,
    };
  });
}

function computeMetrics(
  students: Student[],
  books: Book[],
  borrows: EnrichedBorrowRecord[],
  departments: Department[]
) {
  const returnedBorrows = borrows.filter((b) => b.return_status === 'Returned').length;
  const activeBorrows = borrows.length - returnedBorrows;
  const returnRate = borrows.length > 0 ? Math.round((returnedBorrows / borrows.length) * 100) : 0;

  return {
    totalBooks: books.length,
    totalStudents: students.length,
    totalBorrows: borrows.length,
    activeBorrows,
    returnedBorrows,
    totalDepartments: departments.length,
    returnRate,
  };
}

export async function getLibrarySnapshot(studentTable: StudentTableKey): Promise<LibrarySnapshot> {
  if (dbAvailable && pool) {
    const tbl = STUDENT_TABLE_SQL[studentTable];
    const [studentsRes, booksRes, borrowsRes, deptsRes] = await Promise.all([
      pool.query<Student>(`SELECT usn, name, dept FROM ${tbl} ORDER BY usn ASC`),
      pool.query<Book>('SELECT book_id, book_name, author FROM "public"."books" ORDER BY book_id ASC'),
      pool.query<BorrowRecord>(
        'SELECT borrower_id, usn, book_id, borrow_title, return_status FROM "public"."borrow" ORDER BY borrower_id ASC'
      ),
      pool.query<Department>(
        'SELECT dept_id, dept_name, hod, hod_email FROM "public"."department" ORDER BY dept_id ASC'
      ),
    ]);

    const students = studentsRes.rows.map((r) => ({
      usn: Number(r.usn),
      name: r.name ?? '',
      dept: r.dept ?? '',
    }));
    const books = booksRes.rows.map((r) => ({
      book_id: Number(r.book_id),
      book_name: r.book_name ?? '',
      author: r.author ?? '',
    }));
    const borrows = enrichBorrows(borrowsRes.rows, students, books);
    const departments = deptsRes.rows.map((r) => ({
      dept_id: Number(r.dept_id),
      dept_name: r.dept_name ?? '',
      hod: r.hod ?? null,
      hod_email: r.hod_email ?? null,
    }));

    return {
      source: 'postgres',
      studentTable,
      metrics: computeMetrics(students, books, borrows, departments),
      students,
      books,
      borrows,
      departments,
    };
  }

  const students = [...previewState[studentTable]].sort((a, b) => a.usn - b.usn);
  const books = [...previewState.books].sort((a, b) => a.book_id - b.book_id);
  const borrows = enrichBorrows(
    [...previewState.borrow].sort((a, b) => a.borrower_id - b.borrower_id),
    students,
    books
  );
  const departments = [...previewState.department].sort((a, b) => a.dept_id - b.dept_id);

  return {
    source: 'preview',
    studentTable,
    metrics: computeMetrics(students, books, borrows, departments),
    students,
    books,
    borrows,
    departments,
  };
}

// --- Students CRUD ---

export async function createStudent(
  studentTable: StudentTableKey,
  payload: Student
): Promise<Student> {
  if (dbAvailable && pool) {
    const tbl = STUDENT_TABLE_SQL[studentTable];
    const res = await pool.query<Student>(
      `INSERT INTO ${tbl} (usn, name, dept) VALUES ($1, $2, $3) RETURNING usn, name, dept`,
      [payload.usn, payload.name, payload.dept]
    );
    return res.rows[0];
  }

  const list = previewState[studentTable];
  if (list.some((s) => s.usn === payload.usn)) {
    throw Object.assign(new Error(`Student with USN ${payload.usn} already exists.`), { status: 409 });
  }
  list.push({ ...payload });
  return payload;
}

export async function updateStudent(
  studentTable: StudentTableKey,
  usn: number,
  payload: Pick<Student, 'name' | 'dept'>
): Promise<Student | null> {
  if (dbAvailable && pool) {
    const tbl = STUDENT_TABLE_SQL[studentTable];
    const res = await pool.query<Student>(
      `UPDATE ${tbl} SET name = $1, dept = $2 WHERE usn = $3 RETURNING usn, name, dept`,
      [payload.name, payload.dept, usn]
    );
    return res.rows[0] ?? null;
  }

  const idx = previewState[studentTable].findIndex((s) => s.usn === usn);
  if (idx === -1) return null;
  previewState[studentTable][idx] = { usn, name: payload.name, dept: payload.dept };
  return previewState[studentTable][idx];
}

export async function deleteStudent(studentTable: StudentTableKey, usn: number): Promise<boolean> {
  if (dbAvailable && pool) {
    const tbl = STUDENT_TABLE_SQL[studentTable];
    const res = await pool.query(`DELETE FROM ${tbl} WHERE usn = $1`, [usn]);
    return (res.rowCount ?? 0) > 0;
  }

  const before = previewState[studentTable].length;
  previewState[studentTable] = previewState[studentTable].filter((s) => s.usn !== usn);
  return previewState[studentTable].length < before;
}

// --- Books CRUD ---

export async function createBook(payload: Book): Promise<Book> {
  if (dbAvailable && pool) {
    const existing = await pool.query('SELECT 1 FROM "public"."books" WHERE book_id = $1 LIMIT 1', [
      payload.book_id,
    ]);
    if ((existing.rowCount ?? 0) > 0) {
      throw Object.assign(new Error(`Book with ID ${payload.book_id} already exists.`), { status: 409 });
    }
    const res = await pool.query<Book>(
      'INSERT INTO "public"."books" (book_id, book_name, author) VALUES ($1, $2, $3) RETURNING book_id, book_name, author',
      [payload.book_id, payload.book_name, payload.author]
    );
    return res.rows[0];
  }

  if (previewState.books.some((b) => b.book_id === payload.book_id)) {
    throw Object.assign(new Error(`Book with ID ${payload.book_id} already exists.`), { status: 409 });
  }
  previewState.books.push({ ...payload });
  return payload;
}

export async function updateBook(
  bookId: number,
  payload: Pick<Book, 'book_name' | 'author'>
): Promise<Book | null> {
  if (dbAvailable && pool) {
    const res = await pool.query<Book>(
      'UPDATE "public"."books" SET book_name = $1, author = $2 WHERE book_id = $3 RETURNING book_id, book_name, author',
      [payload.book_name, payload.author, bookId]
    );
    return res.rows[0] ?? null;
  }

  const idx = previewState.books.findIndex((b) => b.book_id === bookId);
  if (idx === -1) return null;
  previewState.books[idx] = { book_id: bookId, book_name: payload.book_name, author: payload.author };
  return previewState.books[idx];
}

export async function deleteBook(bookId: number): Promise<boolean> {
  if (dbAvailable && pool) {
    const res = await pool.query('DELETE FROM "public"."books" WHERE book_id = $1', [bookId]);
    return (res.rowCount ?? 0) > 0;
  }

  const before = previewState.books.length;
  previewState.books = previewState.books.filter((b) => b.book_id !== bookId);
  return previewState.books.length < before;
}

// --- Borrow Records CRUD ---

export async function createBorrow(payload: BorrowRecord): Promise<BorrowRecord> {
  if (dbAvailable && pool) {
    const existing = await pool.query(
      'SELECT 1 FROM "public"."borrow" WHERE borrower_id = $1 LIMIT 1',
      [payload.borrower_id]
    );
    if ((existing.rowCount ?? 0) > 0) {
      throw Object.assign(
        new Error(`Borrow record with Borrower ID ${payload.borrower_id} already exists.`),
        { status: 409 }
      );
    }
    const res = await pool.query<BorrowRecord>(
      'INSERT INTO "public"."borrow" (borrower_id, usn, book_id, borrow_title, return_status) VALUES ($1, $2, $3, $4, $5) RETURNING borrower_id, usn, book_id, borrow_title, return_status',
      [
        payload.borrower_id,
        payload.usn,
        payload.book_id,
        payload.borrow_title,
        payload.return_status,
      ]
    );
    return res.rows[0];
  }

  if (previewState.borrow.some((r) => r.borrower_id === payload.borrower_id)) {
    throw Object.assign(
      new Error(`Borrow record with Borrower ID ${payload.borrower_id} already exists.`),
      { status: 409 }
    );
  }
  previewState.borrow.push({ ...payload });
  return payload;
}

export async function updateBorrow(
  borrowerId: number,
  payload: Omit<BorrowRecord, 'borrower_id'>
): Promise<BorrowRecord | null> {
  if (dbAvailable && pool) {
    const res = await pool.query<BorrowRecord>(
      'UPDATE "public"."borrow" SET usn = $1, book_id = $2, borrow_title = $3, return_status = $4 WHERE borrower_id = $5 RETURNING borrower_id, usn, book_id, borrow_title, return_status',
      [payload.usn, payload.book_id, payload.borrow_title, payload.return_status, borrowerId]
    );
    return res.rows[0] ?? null;
  }

  const idx = previewState.borrow.findIndex((r) => r.borrower_id === borrowerId);
  if (idx === -1) return null;
  previewState.borrow[idx] = { borrower_id: borrowerId, ...payload };
  return previewState.borrow[idx];
}

export async function updateBorrowStatus(
  borrowerId: number,
  returnStatus: ReturnStatus
): Promise<BorrowRecord | null> {
  if (dbAvailable && pool) {
    const res = await pool.query<BorrowRecord>(
      'UPDATE "public"."borrow" SET return_status = $1 WHERE borrower_id = $2 RETURNING borrower_id, usn, book_id, borrow_title, return_status',
      [returnStatus, borrowerId]
    );
    return res.rows[0] ?? null;
  }

  const idx = previewState.borrow.findIndex((r) => r.borrower_id === borrowerId);
  if (idx === -1) return null;
  previewState.borrow[idx] = { ...previewState.borrow[idx], return_status: returnStatus };
  return previewState.borrow[idx];
}

export async function deleteBorrow(borrowerId: number): Promise<boolean> {
  if (dbAvailable && pool) {
    const res = await pool.query('DELETE FROM "public"."borrow" WHERE borrower_id = $1', [
      borrowerId,
    ]);
    return (res.rowCount ?? 0) > 0;
  }

  const before = previewState.borrow.length;
  previewState.borrow = previewState.borrow.filter((r) => r.borrower_id !== borrowerId);
  return previewState.borrow.length < before;
}

// --- Departments CRUD ---

export async function createDepartment(payload: Department): Promise<Department> {
  if (dbAvailable && pool) {
    const res = await pool.query<Department>(
      'INSERT INTO "public"."department" (dept_id, dept_name, hod, hod_email) VALUES ($1, $2, $3, $4) RETURNING dept_id, dept_name, hod, hod_email',
      [payload.dept_id, payload.dept_name, payload.hod, payload.hod_email]
    );
    return res.rows[0];
  }

  if (previewState.department.some((d) => d.dept_id === payload.dept_id)) {
    throw Object.assign(new Error(`Department with ID ${payload.dept_id} already exists.`), {
      status: 409,
    });
  }
  previewState.department.push({ ...payload });
  return payload;
}

export async function updateDepartment(
  deptId: number,
  payload: Omit<Department, 'dept_id'>
): Promise<Department | null> {
  if (dbAvailable && pool) {
    const res = await pool.query<Department>(
      'UPDATE "public"."department" SET dept_name = $1, hod = $2, hod_email = $3 WHERE dept_id = $4 RETURNING dept_id, dept_name, hod, hod_email',
      [payload.dept_name, payload.hod, payload.hod_email, deptId]
    );
    return res.rows[0] ?? null;
  }

  const idx = previewState.department.findIndex((d) => d.dept_id === deptId);
  if (idx === -1) return null;
  previewState.department[idx] = { dept_id: deptId, ...payload };
  return previewState.department[idx];
}

export async function deleteDepartment(deptId: number): Promise<boolean> {
  if (dbAvailable && pool) {
    const res = await pool.query('DELETE FROM "public"."department" WHERE dept_id = $1', [deptId]);
    return (res.rowCount ?? 0) > 0;
  }

  const before = previewState.department.length;
  previewState.department = previewState.department.filter((d) => d.dept_id !== deptId);
  return previewState.department.length < before;
}
