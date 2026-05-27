import { PayrollPageShell } from "./PayrollPageShell";

type Crumb = { label: string; href?: string };

type Props = {
  title: string;
  description?: string;
  backHref?: string;
  breadcrumbs?: Crumb[];
  children: React.ReactNode;
};

/** Wraps legacy payroll page body in PayrollPageShell without rewriting inner tables. */
export function PayrollLegacyPage({
  title,
  description,
  backHref = "/people/payroll",
  breadcrumbs,
  children,
}: Props) {
  return (
    <PayrollPageShell
      title={title}
      description={description}
      backHref={backHref}
      breadcrumbs={breadcrumbs ?? [{ label: "Payroll", href: "/people/payroll" }, { label: title }]}
      showPeriod={false}
    >
      {children}
    </PayrollPageShell>
  );
}
