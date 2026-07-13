import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { NobleXPageHeader } from "@/components/noblex";
import { InvestmentStatusBadge } from "./InvestmentStatusBadges";
import { Button } from "@/components/ui/button";
import AskCopilotButton from "@/components/copilot/AskCopilotButton";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";

interface AssetHeader {
  id?: number;
  investmentName: string;
  investmentCode: string;
  assetType: string;
  currencyCode: string;
  status: string;
  accountingClassification?: string;
  riskLevel?: string;
  holding?: {
    currentMarketValue?: number;
    unrealizedGainLoss?: number;
  };
}

interface InvestmentDetailHeaderProps {
  asset: AssetHeader;
  actions?: ReactNode;
}

export function InvestmentDetailHeader({ asset, actions }: InvestmentDetailHeaderProps) {
  return (
    <>
      <NobleXPageHeader
        title={asset.investmentName}
        subtitle={`${asset.investmentCode} · ${asset.assetType} · ${asset.currencyCode}${asset.accountingClassification ? ` · ${asset.accountingClassification}` : ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <InvestmentStatusBadge status={asset.status} />
            {asset.riskLevel && (
              <span className="text-xs text-noblex-slate border border-noblex-border rounded px-2 py-1">
                Risk: {asset.riskLevel}
              </span>
            )}
            {actions}
            {asset.id && (
              <AskCopilotButton
                entityType="investment"
                entityId={asset.id}
                module="investment"
                presetQuestion={`Tell me about investment ${asset.investmentCode || asset.id}`}
              />
            )}
            {asset.id && (
              <Button variant="outline" asChild>
                <Link to={`/investments/assets/${asset.id}/edit`}>Edit</Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/investments/portfolio">Back to portfolio</Link>
            </Button>
          </div>
        }
      />
      {(asset.holding?.currentMarketValue != null || asset.holding?.unrealizedGainLoss != null) && (
        <div className="flex flex-wrap gap-6 text-sm text-noblex-platinum -mt-2">
          {asset.holding?.currentMarketValue != null && (
            <span>Market value: <span className="font-mono text-noblex-gold-light">{formatCurrencySafe(asset.holding.currentMarketValue)}</span></span>
          )}
          {asset.holding?.unrealizedGainLoss != null && (
            <span>Unrealized G/L: <span className="font-mono text-noblex-gold-light">{formatCurrencySafe(asset.holding.unrealizedGainLoss)}</span></span>
          )}
        </div>
      )}
    </>
  );
}
