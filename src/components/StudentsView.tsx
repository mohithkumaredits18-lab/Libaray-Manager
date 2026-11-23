import { useMemo, useState } from 'react';
import { Download, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { downloadCsv } from '../lib/api';
import type {
  Department,
  EnrichedBorrowRecord,
  Student,
  StudentTableKey,
} from '../types/library';

interface StudentsViewProps {
  loading: boolean;
  studentTable: StudentTableKey;
  onChangeStudentTable: (table: StudentTableKey) => void;
  students: Student[];
  borrows: EnrichedBorrowRecord[];
  departments: Department[];
  onAddStudent: () => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (student: Student) => void;
  onInspectStudent: (student: Student) => void;
  onIssueForStudent: (usn: number) => void;
}

export function StudentsView({
  loading,
  studentTable,
  onChangeStudentTable,
  students,
  borrows,
  departments,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onInspectStudent,
  onIssueForStudent,
}: StudentsViewProps) {
  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  const deptMap = useMemo(
    () => new Map(departments.map((d) => [d.dept_name.toUpperCase(), d])),
    [departments]
  );

  const uniqueDepts = useMemo(() => {
    const set = new Set<string>(students.map((s) => s.dept).filter(Boolean));
    return Array.from(set).sort();
  }, [students]);

  const studentStats = useMemo(() => {
    const map = new Map<number, { total: number; active: number }>();
    for (const s of students) map.set(s.usn, { total: 0, active: 0 });
    for (const b of borrows) {
      const entry = map.get(b.usn);
      if (entry) {
        entry.total += 1;
        if (b.return_status === 'Not Returned') entry.active += 1;
      }
    }
    return map;
  }, [students, borrows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (deptFilter !== 'all' && s.dept !== deptFilter) return false;
      if (!q) return true;
      return (
        String(s.usn).includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.dept.toLowerCase().includes(q)
      );
    });
  }, [students, query, deptFilter]);

  function handleExport() {
    downloadCsv(
      `library-${studentTable}.csv`,
      ['USN', 'Name', 'Department', 'Department HOD', 'Total Borrows', 'Active Borrows'],
      filtered.map((s) => {
        const st = studentStats.get(s.usn);
        const deptInfo = deptMap.get(s.dept.toUpperCase());
        return [s.usn, s.name, s.dept, deptInfo?.hod ?? '', st?.total ?? 0, st?.active ?? 0];
      })
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Student Registry</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            <span className="font-mono tabular-nums text-slate-700">{students.length}</span> students in{' '}
            <span className="font-mono text-xs text-slate-700">{studentTable}</span> with USN, name, and department details.
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
            onClick={onAddStudent}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Student
          </button>
        </div>
      </div>

      {/* Filter Toolbar + Table Selector */}
      <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by USN, name, or department..."
              aria-label="Search students"
              className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/15"
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            aria-label="Filter students by department"
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
          >
            <option value="all">All Departments</option>
            {uniqueDepts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Roster Source Table Selector (students17 / students18) */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <span className="text-xs text-slate-500 whitespace-nowrap">Roster table</span>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(['students17', 'students18'] as const).map((tbl) => (
              <button
                key={tbl}
                type="button"
                onClick={() => onChangeStudentTable(tbl)}
                className={`rounded-md px-2.5 py-1 font-mono text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  studentTable === tbl
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
              <th className="py-2.5 pl-6 pr-3 whitespace-nowrap">USN</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Student Name</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Department</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Department HOD</th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap">Active Loans</th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap">Total Borrows</th>
              <th className="py-2.5 pl-3 pr-6 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx} className="h-11">
                  <td colSpan={7} className="px-6 py-2.5">
                    <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <Users className="mx-auto h-6 w-6 text-slate-400" />
                  <p className="mt-2 text-sm font-medium text-slate-900">No students found</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Register a student with their USN, name, and department.
                  </p>
                  <button
                    type="button"
                    onClick={onAddStudent}
                    className="mt-4 rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap"
                  >
                    Add Student
                  </button>
                </td>
              </tr>
            ) : (
              filtered.map((student) => {
                const stats = studentStats.get(student.usn) ?? { total: 0, active: 0 };
                const deptInfo = deptMap.get(student.dept.trim().toUpperCase());
                return (
                  <tr key={student.usn} className="transition-colors hover:bg-slate-50/80">
                    <td className="py-3 pl-6 pr-3 font-mono text-xs font-medium tabular-nums text-slate-700 whitespace-nowrap">
                      {student.usn}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onInspectStudent(student)}
                        className="font-medium text-slate-900 hover:text-blue-700 hover:underline"
                      >
                        {student.name}
                      </button>
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-700 whitespace-nowrap">
                      {student.dept}
                    </td>
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                      {deptInfo?.hod ? (
                        <span>
                          {deptInfo.hod}
                          {deptInfo.hod_email && (
                            <span className="ml-1.5 text-xs text-slate-400">
                              · {deptInfo.hod_email}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                      <span className={stats.active > 0 ? 'font-semibold text-amber-700' : 'text-slate-500'}>
                        {stats.active}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs tabular-nums text-slate-700 whitespace-nowrap">
                      {stats.total}
                    </td>
                    <td className="py-3 pl-3 pr-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onIssueForStudent(student.usn)}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
                        >
                          Issue Book
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditStudent(student)}
                          aria-label={`Edit student ${student.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteStudent(student)}
                          aria-label={`Delete student ${student.name}`}
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
