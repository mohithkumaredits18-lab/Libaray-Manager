import { useMemo, useState } from 'react';
import { Building2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { Department, EnrichedBorrowRecord, Student } from '../types/library';

interface DepartmentsViewProps {
  loading: boolean;
  departments: Department[];
  students: Student[];
  borrows: EnrichedBorrowRecord[];
  onAddDepartment: () => void;
  onEditDepartment: (dept: Department) => void;
  onDeleteDepartment: (dept: Department) => void;
}

export function DepartmentsView({
  loading,
  departments,
  students,
  borrows,
  onAddDepartment,
  onEditDepartment,
  onDeleteDepartment,
}: DepartmentsViewProps) {
  const [query, setQuery] = useState('');

  const countsByDept = useMemo(() => {
    const map = new Map<string, { students: number; totalBorrows: number; activeBorrows: number }>();
    for (const s of students) {
      const k = s.dept.trim().toUpperCase();
      const entry = map.get(k) ?? { students: 0, totalBorrows: 0, activeBorrows: 0 };
      entry.students += 1;
      map.set(k, entry);
    }
    for (const b of borrows) {
      if (!b.student_dept) continue;
      const k = b.student_dept.trim().toUpperCase();
      const entry = map.get(k) ?? { students: 0, totalBorrows: 0, activeBorrows: 0 };
      entry.totalBorrows += 1;
      if (b.return_status === 'Not Returned') entry.activeBorrows += 1;
      map.set(k, entry);
    }
    return map;
  }, [students, borrows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter(
      (d) =>
        String(d.dept_id).includes(q) ||
        d.dept_name.toLowerCase().includes(q) ||
        (d.hod?.toLowerCase().includes(q) ?? false) ||
        (d.hod_email?.toLowerCase().includes(q) ?? false)
    );
  }, [departments, query]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Academic Departments</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            <span className="font-mono tabular-nums text-slate-700">{departments.length}</span> departments from the{' '}
            <span className="font-mono text-xs text-slate-700">department</span> table with HOD directory.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddDepartment}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Department
        </button>
      </div>

      <div className="border-b border-slate-200 px-6 py-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search department name, HOD, or email..."
            aria-label="Search departments"
            className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/15"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
              <th className="py-2.5 pl-6 pr-3 whitespace-nowrap">Dept ID</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Department</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Head of Department</th>
              <th className="px-3 py-2.5 whitespace-nowrap">HOD Email</th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap">Students</th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap">Active Loans</th>
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
                  <Building2 className="mx-auto h-6 w-6 text-slate-400" />
                  <p className="mt-2 text-sm font-medium text-slate-900">No departments found</p>
                  <button
                    type="button"
                    onClick={onAddDepartment}
                    className="mt-4 rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap"
                  >
                    Add Department
                  </button>
                </td>
              </tr>
            ) : (
              filtered.map((dept) => {
                const counts = countsByDept.get(dept.dept_name.trim().toUpperCase()) ?? {
                  students: 0,
                  totalBorrows: 0,
                  activeBorrows: 0,
                };
                return (
                  <tr key={dept.dept_id} className="transition-colors hover:bg-slate-50/80">
                    <td className="py-3 pl-6 pr-3 font-mono text-xs font-medium tabular-nums text-slate-700 whitespace-nowrap">
                      #{dept.dept_id}
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {dept.dept_name}
                    </td>
                    <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                      {dept.hod ?? '—'}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {dept.hod_email ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs tabular-nums text-slate-700 whitespace-nowrap">
                      {counts.students}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs tabular-nums text-slate-700 whitespace-nowrap">
                      {counts.activeBorrows}
                    </td>
                    <td className="py-3 pl-3 pr-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditDepartment(dept)}
                          aria-label={`Edit department ${dept.dept_name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteDepartment(dept)}
                          aria-label={`Delete department ${dept.dept_name}`}
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
