import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createBook,
  createBorrow,
  createDepartment,
  createStudent,
  deleteBook,
  deleteBorrow,
  deleteDepartment,
  deleteStudent,
  getDataSource,
  getLibrarySnapshot,
  initDatabase,
  resolveStudentTable,
  updateBook,
  updateBorrow,
  updateBorrowStatus,
  updateDepartment,
  updateStudent,
} from './server/db.ts';
import type { ReturnStatus } from './src/types/library.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_PG_INT = 2_147_483_647;

function parsePositiveInt(value: unknown, fieldName: string): number {
  const num = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (!Number.isSafeInteger(num) || num <= 0 || num > MAX_PG_INT) {
    throw Object.assign(new Error(`${fieldName} must be a positive integer.`), { status: 400 });
  }
  return num;
}

function parseRequiredString(value: unknown, fieldName: string, maxLen: number): string {
  if (typeof value !== 'string') {
    throw Object.assign(new Error(`${fieldName} is required.`), { status: 400 });
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw Object.assign(new Error(`${fieldName} cannot be empty.`), { status: 400 });
  }
  if (trimmed.length > maxLen) {
    throw Object.assign(new Error(`${fieldName} must be at most ${maxLen} characters.`), {
      status: 400,
    });
  }
  return trimmed;
}

function parseOptionalString(value: unknown, fieldName: string, maxLen: number): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') {
    throw Object.assign(new Error(`${fieldName} must be text.`), { status: 400 });
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLen) {
    throw Object.assign(new Error(`${fieldName} must be at most ${maxLen} characters.`), {
      status: 400,
    });
  }
  return trimmed;
}

function parseReturnStatus(value: unknown): ReturnStatus {
  if (value === 'Returned' || value === 'Not Returned') {
    return value;
  }
  throw Object.assign(new Error('Return status must be either "Returned" or "Not Returned".'), {
    status: 400,
  });
}

function parseOptionalEmail(value: unknown): string | null {
  const email = parseOptionalString(value, 'HOD email', 50);
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error('HOD email must be a valid email address.'), { status: 400 });
  }
  return email;
}

function mapServerError(err: unknown): { status: number; message: string } {
  if (err && typeof err === 'object') {
    const record = err as { status?: number; code?: string; message?: string };
    if (typeof record.status === 'number' && record.status >= 400 && record.status < 500) {
      return { status: record.status, message: record.message || 'Invalid request.' };
    }
    if (record.code === '23505') {
      return { status: 409, message: 'A record with that unique identifier already exists.' };
    }
    if (record.code === '23503') {
      return {
        status: 409,
        message: 'Cannot remove or update this record because another table references it.',
      };
    }
    if (record.code === '22001') {
      return { status: 400, message: 'One or more fields exceed the database character limit.' };
    }
  }
  return { status: 500, message: 'An unexpected database error occurred.' };
}

async function startServer() {
  const dbInit = await initDatabase();
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));

  // --- API Routes ---

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, source: getDataSource() });
  });

  app.get('/api/library', async (req, res, next) => {
    try {
      const studentTable = resolveStudentTable(req.query.studentTable);
      const snapshot = await getLibrarySnapshot(studentTable);
      res.json(snapshot);
    } catch (err) {
      next(err);
    }
  });

  // Students CRUD
  app.post('/api/students', async (req, res, next) => {
    try {
      const studentTable = resolveStudentTable(req.query.studentTable ?? req.body?.studentTable);
      const usn = parsePositiveInt(req.body?.usn, 'USN');
      const name = parseRequiredString(req.body?.name, 'Student name', 20);
      const dept = parseRequiredString(req.body?.dept, 'Department', 20);
      const created = await createStudent(studentTable, { usn, name, dept });
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/students/:usn', async (req, res, next) => {
    try {
      const studentTable = resolveStudentTable(req.query.studentTable ?? req.body?.studentTable);
      const usn = parsePositiveInt(req.params.usn, 'USN');
      const name = parseRequiredString(req.body?.name, 'Student name', 20);
      const dept = parseRequiredString(req.body?.dept, 'Department', 20);
      const updated = await updateStudent(studentTable, usn, { name, dept });
      if (!updated) {
        res.status(404).json({ error: `Student with USN ${usn} not found.` });
        return;
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/students/:usn', async (req, res, next) => {
    try {
      const studentTable = resolveStudentTable(req.query.studentTable);
      const usn = parsePositiveInt(req.params.usn, 'USN');
      const deleted = await deleteStudent(studentTable, usn);
      if (!deleted) {
        res.status(404).json({ error: `Student with USN ${usn} not found.` });
        return;
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // Books CRUD
  app.post('/api/books', async (req, res, next) => {
    try {
      const book_id = parsePositiveInt(req.body?.book_id, 'Book ID');
      const book_name = parseRequiredString(req.body?.book_name, 'Book name', 20);
      const author = parseRequiredString(req.body?.author, 'Author', 20);
      const created = await createBook({ book_id, book_name, author });
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/books/:bookId', async (req, res, next) => {
    try {
      const bookId = parsePositiveInt(req.params.bookId, 'Book ID');
      const book_name = parseRequiredString(req.body?.book_name, 'Book name', 20);
      const author = parseRequiredString(req.body?.author, 'Author', 20);
      const updated = await updateBook(bookId, { book_name, author });
      if (!updated) {
        res.status(404).json({ error: `Book with ID ${bookId} not found.` });
        return;
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/books/:bookId', async (req, res, next) => {
    try {
      const bookId = parsePositiveInt(req.params.bookId, 'Book ID');
      const deleted = await deleteBook(bookId);
      if (!deleted) {
        res.status(404).json({ error: `Book with ID ${bookId} not found.` });
        return;
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // Borrow Records CRUD
  app.post('/api/borrows', async (req, res, next) => {
    try {
      const borrower_id = parsePositiveInt(req.body?.borrower_id, 'Borrower ID');
      const usn = parsePositiveInt(req.body?.usn, 'Student USN');
      const book_id = parsePositiveInt(req.body?.book_id, 'Book ID');
      const borrow_title = parseRequiredString(req.body?.borrow_title, 'Borrow title', 50);
      const return_status = parseReturnStatus(req.body?.return_status ?? 'Not Returned');
      const created = await createBorrow({
        borrower_id,
        usn,
        book_id,
        borrow_title,
        return_status,
      });
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/borrows/:borrowerId', async (req, res, next) => {
    try {
      const borrowerId = parsePositiveInt(req.params.borrowerId, 'Borrower ID');
      const usn = parsePositiveInt(req.body?.usn, 'Student USN');
      const book_id = parsePositiveInt(req.body?.book_id, 'Book ID');
      const borrow_title = parseRequiredString(req.body?.borrow_title, 'Borrow title', 50);
      const return_status = parseReturnStatus(req.body?.return_status);
      const updated = await updateBorrow(borrowerId, {
        usn,
        book_id,
        borrow_title,
        return_status,
      });
      if (!updated) {
        res.status(404).json({ error: `Borrow record ${borrowerId} not found.` });
        return;
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.patch('/api/borrows/:borrowerId/status', async (req, res, next) => {
    try {
      const borrowerId = parsePositiveInt(req.params.borrowerId, 'Borrower ID');
      const return_status = parseReturnStatus(req.body?.return_status);
      const updated = await updateBorrowStatus(borrowerId, return_status);
      if (!updated) {
        res.status(404).json({ error: `Borrow record ${borrowerId} not found.` });
        return;
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/borrows/:borrowerId', async (req, res, next) => {
    try {
      const borrowerId = parsePositiveInt(req.params.borrowerId, 'Borrower ID');
      const deleted = await deleteBorrow(borrowerId);
      if (!deleted) {
        res.status(404).json({ error: `Borrow record ${borrowerId} not found.` });
        return;
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // Departments CRUD
  app.post('/api/departments', async (req, res, next) => {
    try {
      const dept_id = parsePositiveInt(req.body?.dept_id, 'Department ID');
      const dept_name = parseRequiredString(req.body?.dept_name, 'Department name', 50);
      const hod = parseOptionalString(req.body?.hod, 'Head of department', 50);
      const hod_email = parseOptionalEmail(req.body?.hod_email);
      const created = await createDepartment({ dept_id, dept_name, hod, hod_email });
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/departments/:deptId', async (req, res, next) => {
    try {
      const deptId = parsePositiveInt(req.params.deptId, 'Department ID');
      const dept_name = parseRequiredString(req.body?.dept_name, 'Department name', 50);
      const hod = parseOptionalString(req.body?.hod, 'Head of department', 50);
      const hod_email = parseOptionalEmail(req.body?.hod_email);
      const updated = await updateDepartment(deptId, { dept_name, hod, hod_email });
      if (!updated) {
        res.status(404).json({ error: `Department ${deptId} not found.` });
        return;
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/departments/:deptId', async (req, res, next) => {
    try {
      const deptId = parsePositiveInt(req.params.deptId, 'Department ID');
      const deleted = await deleteDepartment(deptId);
      if (!deleted) {
        res.status(404).json({ error: `Department ${deptId} not found.` });
        return;
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // API Error handler
  app.use('/api', (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const mapped = mapServerError(err);
    res.status(mapped.status).json({ error: mapped.message });
  });

  // Mount Vite middleware in dev or serve static dist in production
  const isProd = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(__dirname, 'dist');

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Folio Library server running on port ${port} (${dbInit.source} mode)`);
  });
}

startServer();
