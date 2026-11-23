import type {
  Book,
  BorrowRecord,
  Department,
  LibrarySnapshot,
  ReturnStatus,
  Student,
  StudentTableKey,
} from '../types/library';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data?.error === 'string' && data.error.trim()
        ? data.error
        : `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data as T;
}

export function fetchLibrarySnapshot(studentTable: StudentTableKey): Promise<LibrarySnapshot> {
  const params = new URLSearchParams({ studentTable });
  return requestJson<LibrarySnapshot>(`/api/library?${params.toString()}`);
}

export function createStudentApi(studentTable: StudentTableKey, payload: Student): Promise<Student> {
  const params = new URLSearchParams({ studentTable });
  return requestJson<Student>(`/api/students?${params.toString()}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateStudentApi(
  studentTable: StudentTableKey,
  usn: number,
  payload: Pick<Student, 'name' | 'dept'>
): Promise<Student> {
  const params = new URLSearchParams({ studentTable });
  return requestJson<Student>(`/api/students/${encodeURIComponent(usn)}?${params.toString()}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteStudentApi(studentTable: StudentTableKey, usn: number): Promise<void> {
  const params = new URLSearchParams({ studentTable });
  return requestJson<void>(`/api/students/${encodeURIComponent(usn)}?${params.toString()}`, {
    method: 'DELETE',
  });
}

export function createBookApi(payload: Book): Promise<Book> {
  return requestJson<Book>('/api/books', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateBookApi(bookId: number, payload: Pick<Book, 'book_name' | 'author'>): Promise<Book> {
  return requestJson<Book>(`/api/books/${encodeURIComponent(bookId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteBookApi(bookId: number): Promise<void> {
  return requestJson<void>(`/api/books/${encodeURIComponent(bookId)}`, {
    method: 'DELETE',
  });
}

export function createBorrowApi(payload: BorrowRecord): Promise<BorrowRecord> {
  return requestJson<BorrowRecord>('/api/borrows', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateBorrowApi(
  borrowerId: number,
  payload: Omit<BorrowRecord, 'borrower_id'>
): Promise<BorrowRecord> {
  return requestJson<BorrowRecord>(`/api/borrows/${encodeURIComponent(borrowerId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function toggleBorrowStatusApi(
  borrowerId: number,
  returnStatus: ReturnStatus
): Promise<BorrowRecord> {
  return requestJson<BorrowRecord>(`/api/borrows/${encodeURIComponent(borrowerId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ return_status: returnStatus }),
  });
}

export function deleteBorrowApi(borrowerId: number): Promise<void> {
  return requestJson<void>(`/api/borrows/${encodeURIComponent(borrowerId)}`, {
    method: 'DELETE',
  });
}

export function createDepartmentApi(payload: Department): Promise<Department> {
  return requestJson<Department>('/api/departments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDepartmentApi(
  deptId: number,
  payload: Omit<Department, 'dept_id'>
): Promise<Department> {
  return requestJson<Department>(`/api/departments/${encodeURIComponent(deptId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteDepartmentApi(deptId: number): Promise<void> {
  return requestJson<void>(`/api/departments/${encodeURIComponent(deptId)}`, {
    method: 'DELETE',
  });
}

function escapeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  // Neutralize spreadsheet formula triggers
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<unknown>>) {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
