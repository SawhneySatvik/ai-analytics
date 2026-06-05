import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  className?: string;
  render: (row: T) => React.ReactNode;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty = "No rows",
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, i: number) => string;
  onRowClick?: (row: T) => void;
  empty?: string;
}) {
  if (rows.length === 0)
    return <p className="py-10 text-center text-xs text-fg-muted">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "whitespace-nowrap px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-fg-muted",
                  c.align === "right" ? "text-right" : "text-left",
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey(row, i)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "border-b border-border/50 transition-colors",
                onRowClick && "cursor-pointer hover:bg-bg/50",
              )}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    "whitespace-nowrap px-3 py-2.5",
                    c.align === "right" ? "text-right tabular" : "text-left",
                    c.className,
                  )}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
