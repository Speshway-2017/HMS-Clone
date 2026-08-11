import { Button } from "./Button";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  return (
    <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1.5 sm:gap-2">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="px-2.5 py-1.5 text-xs sm:text-sm">
        Previous
      </Button>
      <div className="flex items-center gap-1 sm:gap-1.5">
        {pages.map((p, i) => (
          <span key={p} className="flex items-center gap-1 sm:gap-1.5">
            {i > 0 && p - pages[i - 1] > 1 && <span className="text-slate-400 text-xs">...</span>}
            <button
              onClick={() => onPageChange(p)}
              className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg text-xs sm:text-sm font-medium ${
                p === page ? "bg-navy-700 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p}
            </button>
          </span>
        ))}
      </div>
      <Button variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="px-2.5 py-1.5 text-xs sm:text-sm">
        Next
      </Button>
    </div>
  );
}
