import { useTranslation } from "react-i18next";
import { PayrollPageShell } from "./PayrollPageShell";

type Crumb = { label: string; href?: string };

type Props = {
  title?: string;
  titleKey?: string;
  titleValues?: Record<string, string | number>;
  description?: string;
  descriptionKey?: string;
  backHref?: string;
  breadcrumbs?: Crumb[];
  children: React.ReactNode;
};

/** Wraps legacy payroll page body in PayrollPageShell without rewriting inner tables. */
export function PayrollLegacyPage({
  title,
  titleKey,
  titleValues,
  description,
  descriptionKey,
  backHref = "/people/payroll",
  breadcrumbs,
  children,
}: Props) {
  const { t } = useTranslation();
  const resolvedTitle = titleKey ? t(titleKey, titleValues) : (title ?? "");
  const resolvedDescription = descriptionKey
    ? t(descriptionKey)
    : (description ?? t("payroll.workspaceDescription"));

  return (
    <PayrollPageShell
      title={resolvedTitle}
      description={resolvedDescription}
      backHref={backHref}
      breadcrumbs={breadcrumbs ?? [
        { label: t("nav.payroll"), href: "/people/payroll" },
        { label: resolvedTitle },
      ]}
      showPeriod={false}
    >
      {children}
    </PayrollPageShell>
  );
}
