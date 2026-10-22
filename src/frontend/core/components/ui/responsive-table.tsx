import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/core/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * A table that becomes a stack of labelled cards below `md`.
 *
 * The DM and admin tables pin column widths (`w-28`, `w-32`, a `w-56` action
 * column) and carry five columns including an email address and a `Select`, so
 * on a phone they guaranteed horizontal scrolling — `ui/table.tsx` only ever
 * offered `overflow-auto`.
 *
 * One DOM tree, restructured by CSS (see `.responsive-table` in globals.scss),
 * rather than rendering a table and a card list and hiding one. Duplicate DOM
 * would mean two copies of every interactive control in a row — two Selects
 * bound to the same state, two delete buttons, two matches for every
 * accessible-name query in a test.
 *
 * The trade-off is that below `md` the rows stop being table semantics, which
 * is the usual cost of this pattern. Each cell carries `data-label`, rendered
 * as its heading in card mode, so the information is not lost.
 */

export interface Column<T> {
  /** Stable key; also the React key for the cell. */
  key: string;
  /** Column heading. Empty string for an actions column. */
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** Used as the card's title in stacked mode, and never given a label. */
  primary?: boolean;
  /** Right-aligned in table mode; becomes the card's footer row when stacked. */
  actions?: boolean;
  /** Extra classes for the <th>. Width utilities here are ignored when stacked. */
  headClassName?: string;
  cellClassName?: string;
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  getRowKey: (row: T) => string;
  /** Shown instead of the table when `data` is empty. */
  empty?: React.ReactNode;
  className?: string;
}

export function ResponsiveTable<T>({
  data,
  columns,
  getRowKey,
  empty,
  className,
}: Props<T>) {
  if (data.length === 0 && empty) return <>{empty}</>;

  return (
    <div className={cn("responsive-table border border-border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key} className={c.headClassName}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={getRowKey(row)}>
              {columns.map((c) => (
                <TableCell
                  key={c.key}
                  // Rendered as the cell's heading once the row stacks.
                  data-label={
                    typeof c.header === "string" && !c.primary ? c.header : undefined
                  }
                  data-primary={c.primary ? "" : undefined}
                  data-actions={c.actions ? "" : undefined}
                  className={c.cellClassName}
                >
                  {c.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
