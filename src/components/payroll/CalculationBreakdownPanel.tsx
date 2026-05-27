import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export type BreakdownLine = {
  label: string;
  amount: number;
  type?: "earning" | "deduction" | "info";
};

type Props = {
  title?: string;
  earnings?: BreakdownLine[];
  deductions?: BreakdownLine[];
  net?: number;
  snapshot?: Record<string, unknown> | null;
};

function formatAmount(n: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(n);
}

function LineList({ lines, sign }: { lines: BreakdownLine[]; sign: "+" | "-" }) {
  return (
    <ul className="space-y-1 text-sm">
      {lines.map((l, i) => (
        <li key={i} className="flex justify-between gap-4">
          <span className="text-muted-foreground">{l.label}</span>
          <span className={l.type === "deduction" ? "text-destructive" : ""}>
            {sign}
            {formatAmount(Math.abs(l.amount))}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CalculationBreakdownPanel({ title = "Calculation breakdown", earnings = [], deductions = [], net, snapshot }: Props) {
  const gross = earnings.reduce((s, l) => s + l.amount, 0);
  const totalDed = deductions.reduce((s, l) => s + l.amount, 0);
  const computedNet = net ?? gross - totalDed;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {earnings.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground mb-2">Earnings</p>
            <LineList lines={earnings} sign="+" />
          </div>
        )}
        {deductions.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground mb-2">Deductions</p>
            <LineList lines={deductions} sign="-" />
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-semibold">
          <span>Net</span>
          <span>{formatAmount(computedNet)}</span>
        </div>
        {snapshot && Object.keys(snapshot).length > 0 && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Calculation snapshot</summary>
            <pre className="mt-2 overflow-auto max-h-48 rounded bg-muted p-2">
              {JSON.stringify(snapshot, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
