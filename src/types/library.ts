export type StudentTableKey = 'students17' | 'students18';

export type ReturnStatus = 'Returned' | 'Not Returned';

export interface Student {
  usn: number;
  name: string;
  dept: string;
}

export interface Book {
  book_id: number;
  book_name: string;
  author: string;
}

export interface BorrowRecord {
  borrower_id: number;
  usn: number;
  book_id: number;
  borrow_title: string;
  return_status: ReturnStatus;
}

export interface Department {
  dept_id: number;
  dept_name: string;
  hod: string | null;
  hod_email: string | null;
}

export interface EnrichedBorrowRecord extends BorrowRecord {
  student_name: string | null;
  student_dept: string | null;
  book_name: string | null;
  book_author: string | null;
}

export interface LibraryMetrics {
  totalBooks: number;
  totalStudents: number;
  totalBorrows: number;
  activeBorrows: number;
  returnedBorrows: number;
  totalDepartments: number;
  returnRate: number;
}

export interface LibrarySnapshot {
  source: 'postgres' | 'preview';
  studentTable: StudentTableKey;
  metrics: LibraryMetrics;
  students: Student[];
  books: Book[];
  borrows: EnrichedBorrowRecord[];
  departments: Department[];
}
