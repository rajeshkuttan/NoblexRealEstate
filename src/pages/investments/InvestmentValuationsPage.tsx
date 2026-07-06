import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { NobleXPageHeader } from "@/components/noblex";
import { ValuationUpdateForm } from "@/components/investments/ValuationUpdateForm";
import { ValuationImportPanel } from "@/components/investments/ValuationImportPanel";
import { investmentsAPI } from "@/services/api";
import { NobleXDataTable } from "@/components/noblex";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApprovalStatusBadge } from "@/components/investments/InvestmentStatusBadges";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";

export default function InvestmentValuationsPage() {
  const { t } = useTranslation();
  const { data: recentValuations, refetch } = useQuery({
    queryKey: ["investment-valuations-report"],
    queryFn: async () => {
      const res = await investmentsAPI.getReportValuations({ limit: 50 });
      return res.data?.data || [];
    },
  });

  return (
    <div className="space-y-6 p-1">
      <NobleXPageHeader title={t("investments.valuations.title")} subtitle={t("investments.valuations.subtitle")} />
      <ValuationUpdateForm showHistory={false} onSuccess={() => refetch()} />
      <ValuationImportPanel onSuccess={() => refetch()} />

      <div>
        <h3 className="text-sm font-medium text-noblex-gold-light mb-3">Recent valuations (all assets)</h3>
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Market value</TableHead>
              <TableHead>Unrealized G/L</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(recentValuations || []).map((v: {
              id: number;
              valuationDate: string;
              baseMarketValue: number;
              unrealizedGainLoss: number;
              approvalStatus: string;
              asset?: { investmentName: string };
            }) => (
              <TableRow key={v.id}>
                <TableCell>{v.valuationDate}</TableCell>
                <TableCell>{v.asset?.investmentName || "—"}</TableCell>
                <TableCell className="font-mono">{formatCurrencySafe(v.baseMarketValue)}</TableCell>
                <TableCell className="font-mono">{formatCurrencySafe(v.unrealizedGainLoss)}</TableCell>
                <TableCell><ApprovalStatusBadge status={v.approvalStatus} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </NobleXDataTable>
      </div>
    </div>
  );
}
