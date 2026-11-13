import { ReactNode } from "react";

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  dense?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "No records found.",
  dense,
}: DataTableProps<T>) {
  const paddingClass = dense ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs";
  const headerPaddingClass = dense ? "px-2.5 py-1.5 text-[10px]" : "px-3 py-2 text-[11px]";

  return (
    <div className="w-full min-w-0 overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-slate-50/90 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
            {columns.map((col) => (
              <th key={col.header} className={`${headerPaddingClass} ${col.className ?? ""}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-xs text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-emerald-50/20 transition-colors">
                {columns.map((col) => (
                  <td key={col.header} className={`${paddingClass} text-slate-700 ${col.className ?? ""}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
