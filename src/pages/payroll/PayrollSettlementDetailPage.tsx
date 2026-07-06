import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { payrollAPI } from "@/services/api";
import {
  PayrollPageShell,
  PayrollStatusBadge,
  WorkflowActionBar,
  CalculationBreakdownPanel,
  AuditTimelineDrawer,
  type BreakdownLine,
} from "@/components/payroll";
import { usePayrollPermissions } from "@/hooks/payroll/usePayrollPermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PayrollDataTable } from "@/components/payroll";
import { toast } from "sonner";

export default function PayrollSettlementDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const settlementId = Number(id);
  const perms = usePayrollPermissions();
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  const load = () => payrollAPI.workspace.settlementDetail(settlementId).then((r) => setData(r.data?.data));

  useEffect(() => {
    if (settlementId) load();
  }, [settlementId]);

  const settlement = data?.settlement;
  const status = settlement?.status;

  const act = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    try {
      await fn();
      toast.success(label);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const earnings: BreakdownLine[] = (data?.earnings ?? []).map((l: any) => ({
    label: l.lineType?.replace(/_/g, " ") ?? l.description,
    amount: Number(l.amount),
    type: "earning",
  }));
  const deductions: BreakdownLine[] = (data?.deductions ?? []).map((l: any) => ({
    label: l.lineType?.replace(/_/g, " ") ?? l.description,
    amount: Number(l.amount),
    type: "deduction",
  }));

  return (
    <PayrollPageShell
      title={t("payroll.pages.settlementDetail", { id: settlement?.settlementNumber ?? id })}
      description={data?.employee?.employeeName ?? ""}
      breadcrumbs={[
        { label: "Payroll", href: "/people/payroll" },
        { label: "Final settlement", href: "/people/payroll/final-settlement" },
        { label: `#${id}` },
      ]}
      showPeriod={false}
      actions={
        <>
          <PayrollStatusBadge status={status} />
          <WorkflowActionBar
            actions={[
              {
                id: "calc",
                label: "Calculate",
                hidden: !perms.settlement.manage,
                loading: busy === "calculate",
                onClick: () => act("calculate", () => payrollAPI.settlement.settlements.calculate(settlementId)),
              },
              {
                id: "approve",
                label: "Approve",
                hidden: !perms.settlement.approve,
                loading: busy === "approve",
                onClick: () => act("approve", () => payrollAPI.settlement.settlements.approve(settlementId)),
              },
              {
                id: "lock",
                label: "Lock",
                hidden: !perms.settlement.approve,
                loading: busy === "lock",
                confirm: { title: "Lock settlement?", description: "Locked settlements cannot be recalculated." },
                onClick: () => act("lock", () => payrollAPI.settlement.settlements.lock(settlementId)),
              },
              {
                id: "doc",
                label: "Generate statement",
                hidden: !perms.documentsHub.manage,
                onClick: () =>
                  act("document", () => payrollAPI.documentsHub.settlementDocuments.generate(settlementId)),
              },
              {
                id: "post",
                label: "Post to GL",
                hidden: !perms.finance.manage,
                onClick: () => act("post", () => payrollAPI.finance.post.settlement(settlementId)),
              },
            ]}
          />
          <button type="button" className="text-sm underline" onClick={() => setAuditOpen(true)}>
            Audit
          </button>
        </>
      }
    >
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Separation context</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>Last working day: {data?.separation?.lastWorkingDay ?? "—"}</p>
          <p>Reason: {data?.separation?.separationReason ?? "—"}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="calculation">
        <TabsList>
          <TabsTrigger value="calculation">Calculation</TabsTrigger>
          <TabsTrigger value="lines">Lines</TabsTrigger>
          <TabsTrigger value="recoveries">Recoveries</TabsTrigger>
        </TabsList>
        <TabsContent value="calculation" className="mt-4">
          <CalculationBreakdownPanel
            earnings={earnings}
            deductions={deductions}
            net={Number(settlement?.netSettlement)}
            snapshot={data?.calculation_snapshot}
          />
        </TabsContent>
        <TabsContent value="lines" className="mt-4">
          <PayrollDataTable
            columns={[
              { key: "type", header: "Type", cell: (r: any) => r.lineType },
              { key: "amt", header: "Amount", cell: (r: any) => r.amount },
            ]}
            data={settlement?.lines ?? []}
            getRowKey={(r: any) => r.id}
          />
        </TabsContent>
        <TabsContent value="recoveries" className="mt-4">
          <PayrollDataTable
            columns={[
              { key: "type", header: "Type", cell: (r: any) => r.lineType },
              { key: "amt", header: "Amount", cell: (r: any) => r.amount },
            ]}
            data={(settlement?.lines ?? []).filter((l: any) =>
              ["LOAN_RECOVERY", "NOTICE_RECOVERY"].includes(l.lineType)
            )}
            getRowKey={(r: any) => r.id}
            emptyMessage="No recoveries."
          />
        </TabsContent>
      </Tabs>

      <AuditTimelineDrawer
        open={auditOpen}
        onOpenChange={setAuditOpen}
        entityType="settlement"
        entityId={settlementId}
      />
    </PayrollPageShell>
  );
}
