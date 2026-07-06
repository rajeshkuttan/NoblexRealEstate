import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface NobleXDataTableProps {
  children: ReactNode;
  className?: string;
}

export function NobleXDataTable({ children, className }: NobleXDataTableProps) {
  return (
    <div className={cn("uiux-table-shell", className)}>
      <Table>{children}</Table>
    </div>
  );
}

export function NobleXTableHeader({ children }: { children: ReactNode }) {
  return <TableHeader>{children}</TableHeader>;
}

export function NobleXTableBody({ children }: { children: ReactNode }) {
  return <TableBody>{children}</TableBody>;
}

export function NobleXTableRow({
  children,
  selected,
  className,
}: {
  children: ReactNode;
  selected?: boolean;
  className?: string;
}) {
  return (
    <TableRow
      className={cn(
        "border-noblex-border",
        selected && "bg-noblex-gold/5 border-s-2 border-s-noblex-gold",
        className,
      )}
    >
      {children}
    </TableRow>
  );
}

export function NobleXTableHead({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <TableHead className={cn("text-noblex-slate uppercase text-[11px] tracking-wider", className)}>
      {children}
    </TableHead>
  );
}

export function NobleXTableCell({
  children,
  className,
  mono,
  link,
}: {
  children: ReactNode;
  className?: string;
  mono?: boolean;
  link?: boolean;
}) {
  return (
    <TableCell
      className={cn(
        "text-noblex-platinum text-sm py-3",
        mono && "font-mono text-[13px]",
        link && "text-noblex-gold-light",
        className,
      )}
    >
      {children}
    </TableCell>
  );
}
