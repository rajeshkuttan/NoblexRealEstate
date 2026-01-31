import { useState, useEffect } from "react";
import { invoicesAPI } from "@/services/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface InvoiceHistoryTabProps {
  invoiceId: number;
}

export default function InvoiceHistoryTab({ invoiceId }: InvoiceHistoryTabProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await invoicesAPI.getHistory(invoiceId);
        if (response.data && response.data.success) {
          setHistory(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch invoice history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [invoiceId]);

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Loading history...</div>;
  }

  if (history.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No history available.</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((item: any, index: number) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{item.description}</p>
                <p className="text-sm text-muted-foreground">
                  {item.date ? new Date(item.date).toLocaleString("en-AE") : 'Date N/A'} {item.user ? `by ${item.user}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
