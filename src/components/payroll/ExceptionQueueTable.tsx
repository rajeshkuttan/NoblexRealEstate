import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PayrollDataTable, type PayrollColumn } from "./PayrollDataTable";

export type ExceptionItem = {
  id?: string | number;
  employee_id?: number;
  employee_name?: string;
  issue: string;
  severity?: "high" | "medium" | "low";
  action_href?: string;
  action_label?: string;
};

const severityVariant: Record<string, "destructive" | "secondary" | "outline"> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

type Props = {
  items: ExceptionItem[];
  loading?: boolean;
};

export function ExceptionQueueTable({ items, loading }: Props) {
  const columns: PayrollColumn<ExceptionItem>[] = [
    {
      key: "employee",
      header: "Employee",
      cell: (r) => r.employee_name ?? (r.employee_id ? `#${r.employee_id}` : "—"),
    },
    {
      key: "issue",
      header: "Issue",
      cell: (r) => r.issue,
    },
    {
      key: "severity",
      header: "Severity",
      cell: (r) =>
        r.severity ? (
          <Badge variant={severityVariant[r.severity] ?? "outline"}>{r.severity}</Badge>
        ) : (
          "—"
        ),
    },
    {
      key: "action",
      header: "",
      className: "text-right",
      cell: (r) =>
        r.action_href ? (
          <Button variant="link" size="sm" asChild onClick={(e) => e.stopPropagation()}>
            <Link to={r.action_href}>{r.action_label ?? "Review"}</Link>
          </Button>
        ) : null,
    },
  ];

  return (
    <PayrollDataTable
      columns={columns}
      data={items}
      loading={loading}
      emptyMessage="No exceptions for this period."
      getRowKey={(r) => String(r.id ?? `${r.employee_id}-${r.issue}`)}
    />
  );
}
