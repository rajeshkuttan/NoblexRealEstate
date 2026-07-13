import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { NobleXPageHeader } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { investmentsAPI } from "@/services/api";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";
import { toast } from "sonner";

const STEPS = [
  "Select",
  "Trade details",
  "Charges",
  "Funding",
  "Preview",
  "Submit",
];

export default function InvestmentTradeWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    portfolioId: "",
    instrumentId: "",
    mode: "direct",
    orderId: "",
    side: "BUY",
    tradeDate: new Date().toISOString().slice(0, 10),
    settlementDate: "",
    quantity: "100",
    price: "10",
    brokerId: "",
    custodianId: "",
    commission: "0",
    fees: "0",
    taxes: "0",
    withholdingTax: "0",
    bankAccountId: "",
    costBasisMethod: "AVERAGE",
    accountingPolicy: "TRADE_DATE",
    confirmOnCreate: true,
  });
  const [preview, setPreview] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const { data: portfolios } = useQuery({
    queryKey: ["investment-portfolios-v2-mini"],
    queryFn: async () => {
      const res = await investmentsAPI.listPortfoliosV2({ page: 1, limit: 50 });
      return res.data?.data?.portfolios || [];
    },
  });
  const { data: instruments } = useQuery({
    queryKey: ["investment-instruments-mini"],
    queryFn: async () => {
      const res = await investmentsAPI.listInstruments({ page: 1, limit: 50 });
      return res.data?.data?.instruments || [];
    },
  });
  const { data: brokers } = useQuery({
    queryKey: ["investment-brokers-mini"],
    queryFn: async () => {
      const res = await investmentsAPI.listBrokers({ page: 1, limit: 50 });
      return res.data?.data?.brokers || res.data?.data || [];
    },
  });
  const { data: custodians } = useQuery({
    queryKey: ["investment-custodians-mini"],
    queryFn: async () => {
      const res = await investmentsAPI.listCustodians({ page: 1, limit: 50 });
      return res.data?.data?.custodians || res.data?.data || [];
    },
  });
  const { data: orders } = useQuery({
    queryKey: ["investment-orders-placeable"],
    queryFn: async () => {
      const res = await investmentsAPI.listOrders({ page: 1, limit: 50, status: "PLACED" });
      return res.data?.data?.orders || [];
    },
    enabled: form.mode === "order",
  });

  const payload = useMemo(
    () => ({
      portfolioId: Number(form.portfolioId),
      instrumentId: Number(form.instrumentId),
      orderId: form.mode === "order" && form.orderId ? Number(form.orderId) : undefined,
      side: form.side,
      tradeDate: form.tradeDate,
      settlementDate: form.settlementDate || null,
      quantity: Number(form.quantity),
      price: Number(form.price),
      brokerId: form.brokerId ? Number(form.brokerId) : null,
      custodianId: form.custodianId ? Number(form.custodianId) : null,
      commission: Number(form.commission || 0),
      fees: Number(form.fees || 0),
      taxes: Number(form.taxes || 0),
      withholdingTax: Number(form.withholdingTax || 0),
      bankAccountId: form.bankAccountId ? Number(form.bankAccountId) : null,
      costBasisMethod: form.costBasisMethod,
      accountingPolicy: form.accountingPolicy,
      confirm: form.confirmOnCreate,
    }),
    [form]
  );

  const runPreview = async () => {
    try {
      const res = await investmentsAPI.previewTrade(payload);
      const data = res.data?.data;
      setPreview(data);
      if (!data?.valid) {
        toast.error(data?.error || "Preview invalid");
        return false;
      }
      return true;
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Preview failed");
      return false;
    }
  };

  const next = async () => {
    if (step === 0 && (!form.portfolioId || !form.instrumentId)) {
      toast.error("Portfolio and instrument required");
      return;
    }
    if (step === 3) {
      const ok = await runPreview();
      if (!ok) return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const submit = async (asDraft: boolean) => {
    setSaving(true);
    try {
      await investmentsAPI.createTrade({ ...payload, confirm: !asDraft && form.confirmOnCreate });
      toast.success(asDraft ? "Trade saved as draft" : "Trade submitted");
      navigate("/investments/trades");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Submit failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-1 max-w-3xl">
      <NobleXPageHeader title="Trade wizard" subtitle="Order or direct trade with accounting preview" />
      <div className="flex flex-wrap gap-2 text-sm">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className={i === step ? "font-semibold text-foreground" : "text-muted-foreground"}
          >
            {i + 1}. {label}
            {i < STEPS.length - 1 ? " ·" : ""}
          </span>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div>
            <Label>Mode</Label>
            <Select value={form.mode} onValueChange={(v) => set("mode", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Direct trade</SelectItem>
                <SelectItem value="order">From order</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Portfolio</Label>
            <Select value={form.portfolioId || undefined} onValueChange={(v) => set("portfolioId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select portfolio" />
              </SelectTrigger>
              <SelectContent>
                {(portfolios || []).map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.portfolioName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Instrument</Label>
            <Select value={form.instrumentId || undefined} onValueChange={(v) => set("instrumentId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select instrument" />
              </SelectTrigger>
              <SelectContent>
                {(instruments || []).map((i: any) => (
                  <SelectItem key={i.id} value={String(i.id)}>
                    {i.instrumentCode} — {i.instrumentName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Side</Label>
            <Select value={form.side} onValueChange={(v) => set("side", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUY">Buy</SelectItem>
                <SelectItem value="SELL">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.mode === "order" && (
            <div>
              <Label>Placed order</Label>
              <Select value={form.orderId || undefined} onValueChange={(v) => set("orderId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select order" />
                </SelectTrigger>
                <SelectContent>
                  {(orders || []).map((o: any) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.orderNumber} · {o.side} · rem {Number(o.quantity) - Number(o.executedQuantity)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Trade date</Label>
            <Input type="date" value={form.tradeDate} onChange={(e) => set("tradeDate", e.target.value)} />
          </div>
          <div>
            <Label>Settlement date</Label>
            <Input
              type="date"
              value={form.settlementDate}
              onChange={(e) => set("settlementDate", e.target.value)}
            />
          </div>
          <div>
            <Label>Quantity</Label>
            <Input type="number" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
          </div>
          <div>
            <Label>Price</Label>
            <Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} />
          </div>
          <div>
            <Label>Broker</Label>
            <Select value={form.brokerId || undefined} onValueChange={(v) => set("brokerId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {(Array.isArray(brokers) ? brokers : []).map((b: any) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.brokerName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Custodian</Label>
            <Select value={form.custodianId || undefined} onValueChange={(v) => set("custodianId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {(Array.isArray(custodians) ? custodians : []).map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.custodianName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cost basis</Label>
            <Select value={form.costBasisMethod} onValueChange={(v) => set("costBasisMethod", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AVERAGE">Weighted average</SelectItem>
                <SelectItem value="FIFO">FIFO</SelectItem>
                <SelectItem value="SPECIFIC">Specific lot</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Accounting policy</Label>
            <Select value={form.accountingPolicy} onValueChange={(v) => set("accountingPolicy", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRADE_DATE">Trade-date</SelectItem>
                <SelectItem value="SETTLEMENT_DATE">Settlement-date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["commission", "Brokerage"],
            ["fees", "Bank / custody fees"],
            ["taxes", "Taxes"],
            ["withholdingTax", "Withholding"],
          ].map(([key, label]) => (
            <div key={key}>
              <Label>{label}</Label>
              <Input
                type="number"
                value={(form as any)[key]}
                onChange={(e) => set(key, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Partner capital allocation lands in Phase 20. Funding bank account id is optional for now.
          </p>
          <div>
            <Label>Bank account ID</Label>
            <Input
              value={form.bankAccountId}
              onChange={(e) => set("bankAccountId", e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
      )}

      {step === 4 && preview && (
        <div className="space-y-3 text-sm">
          {!preview.valid && <p className="text-destructive">{preview.error}</p>}
          {preview.valid && (
            <>
              <p>
                Gross {formatCurrencySafe(preview.amounts?.grossAmount)} · Net{" "}
                {formatCurrencySafe(preview.amounts?.netSettlement)}
              </p>
              <p>
                Holding qty {preview.holdingImpact?.quantityBefore} →{" "}
                {preview.holdingImpact?.quantityAfter}
                {form.side === "SELL" &&
                  ` (available ${preview.holdingImpact?.availableQuantity})`}
              </p>
              {form.side === "SELL" && (
                <p>Realized G/L: {formatCurrencySafe(preview.realizedGainLoss)}</p>
              )}
              <div>
                <p className="font-medium mb-1">Journal preview ({preview.accountingPolicy})</p>
                <ul className="list-disc pl-5 space-y-1">
                  {(preview.journalPreview?.lines || []).map((l: any, idx: number) => (
                    <li key={idx}>
                      {l.account}: Dr {l.debit} / Cr {l.credit}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
          <Button type="button" variant="outline" onClick={runPreview}>
            Refresh preview
          </Button>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.confirmOnCreate}
              onChange={(e) => set("confirmOnCreate", e.target.checked)}
            />
            Confirm immediately (update lots + create settlement)
          </label>
          <div className="flex gap-2">
            <Button type="button" disabled={saving} onClick={() => submit(false)}>
              Submit
            </Button>
            <Button type="button" variant="outline" disabled={saving} onClick={() => submit(true)}>
              Save draft
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          Back
        </Button>
        {step < STEPS.length - 1 && (
          <Button type="button" onClick={next}>
            Next
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={() => navigate("/investments/trades")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
