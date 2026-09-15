import React from "react";
import { motion } from "framer-motion";

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
  sortable?: boolean;
}

interface TableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onSort?: (key: string) => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
}

function LoadingSkeleton({ columns }: { columns: number }) {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <tr key={i} className="border-b border-slate-800">
          {[...Array(columns)].map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-4 bg-slate-800 rounded animate-pulse"
                style={{ width: `${60 + Math.random() * 30}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function Table<T extends { id: string }>({
  columns,
  data,
  loading = false,
  emptyMessage = "No data found",
  onSort,
  sortKey,
  sortOrder,
}: TableProps<T>) {
  const getValue = (item: T, key: string): any => {
    const keys = key.split(".");
    let val: any = item;
    for (const k of keys) {
      val = val?.[k];
    }
    return val;
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/60">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`
                  px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap
                  ${col.width || ""}
                  ${col.sortable && onSort ? "cursor-pointer hover:text-slate-200 transition-colors select-none" : ""}
                `}
                onClick={() => col.sortable && onSort?.(String(col.key))}
              >
                <span className="inline-flex items-center gap-1.5">
                  {col.header}
                  {col.sortable && sortKey === String(col.key) && (
                    <span className="text-blue-400">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <LoadingSkeleton columns={columns.length} />
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-16 text-slate-500"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="text-4xl opacity-30">📋</div>
                  <p className="text-sm">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((item, idx) => (
              <motion.tr
                key={item.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="border-b border-slate-800/70 hover:bg-slate-800/40 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className="px-4 py-3 text-slate-300"
                  >
                    {col.render
                      ? col.render(item)
                      : String(getValue(item, String(col.key)) ?? "—")}
                  </td>
                ))}
              </motion.tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
