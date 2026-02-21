import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { paymentsAPI, invoicesAPI } from "@/services/api";
import PaymentForm from "@/components/finance/PaymentForm";
import { useToast } from "@/hooks/use-toast";

export default function RecordPaymentPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const { toast } = useToast();
  const invoiceFromState = location.state?.invoice as any;

  const mode = id ? "edit" : "create";
  const [availableInvoices, setAvailableInvoices] = useState<any[]>([]);
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    const load = async () => {
      try {
        const [invRes, payRes] = await Promise.all([
          invoicesAPI.getAll({ limit: 500 }, true).catch(() => ({ data: {} })),
          id ? paymentsAPI.getById(Number(id)).catch(() => ({ data: {} })) : Promise.resolve({ data: null }),
        ]);
        // Extract invoice array (backend returns { data: { invoices, pagination } } or similar)
        let invData = invRes?.data?.data?.invoices ?? invRes?.data?.invoices ?? invRes?.data;
        if (!Array.isArray(invData) && invData && typeof invData === "object" && Array.isArray((invData as any).invoices)) {
          invData = (invData as any).invoices;
        }
        if (!Array.isArray(invData)) {
          invData = [];
        }
        // Map backend shape to same structure as Finance.tsx so PaymentForm gets property, invoiceDetails (amount, unit)
        const mapped = invData.map((inv: any) => {
          const amountPaid = inv.amountPaid ?? (inv.status === "paid" ? parseFloat(inv.totalAmount) : 0);
          const outstanding = parseFloat(inv.totalAmount || 0) - amountPaid;
          return {
            ...inv,
            tenant: inv.tenant ?? { name: "Unknown Tenant" },
            property: {
              name: inv.lease?.unit?.property?.title ?? inv.property?.name ?? "Unknown Property",
              unit: inv.lease?.unit?.unitNumber ?? inv.property?.unit ?? "N/A",
              address: inv.lease?.unit?.property?.address ?? inv.property?.address ?? "",
            },
            lease: inv.lease ?? {},
            invoiceDetails: inv.invoiceDetails ?? {
              total: parseFloat(inv.totalAmount || 0),
              subtotal: parseFloat(inv.subtotal || 0),
              paid: amountPaid,
              outstanding: outstanding > 0 ? outstanding : 0,
              dueDate: inv.dueDate,
              issueDate: inv.invoiceDate,
              description: inv.description,
            },
          };
        });
        setAvailableInvoices(mapped);
        if (id && payRes?.data?.data) {
          setInitialData(payRes.data.data);
        }
      } catch (_) {
        setAvailableInvoices([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSubmit = async (data: any) => {
    try {
      let mappedMethod = data.paymentDetails?.paymentMethod;
      if (mappedMethod === "online_payment") mappedMethod = "online";
      if (mappedMethod === "pdc") mappedMethod = "cheque";
      let mappedStatus = data.status;
      if (mappedStatus === "completed") mappedStatus = "paid";
      if (mappedStatus === "failed") mappedStatus = "cancelled";

      const backendPayload = {
        paymentNumber: data.paymentNumber,
        paymentDate: data.paymentDate,
        amount: data.paymentDetails?.amount,
        paymentMethod: mappedMethod,
        reference: data.paymentDetails?.paymentReference,
        status: mappedStatus,
        notes: data.notes,
        description: data.paymentPurpose?.description,
        bankDetails: data.paymentDetails?.bankDetails,
        invoiceId: data.invoice?.id,
        leaseId: data.invoice?.leaseId,
        tenantId: data.payeeInfo?.payeeId || data.invoice?.tenantId,
        dueDate: data.paymentDate,
        category: data.paymentPurpose?.category,
      };

      if (!backendPayload.paymentNumber || !backendPayload.amount || !backendPayload.leaseId || !backendPayload.tenantId) {
        if (!backendPayload.leaseId) {
          toast({ title: "Error", description: "Lease information is missing. Please ensure an invoice or lease is selected.", variant: "destructive" });
          return;
        }
      }

      if (mode === "create") {
        await paymentsAPI.create(backendPayload);
        toast({ title: "Success", description: "Payment recorded successfully!" });
      } else if (id) {
        await paymentsAPI.update(Number(id), backendPayload);
        toast({ title: "Success", description: "Payment updated successfully!" });
      }
      navigate("/finance");
    } catch (error: any) {
      console.error("Error saving payment:", error);
      toast({ title: "Error", description: error?.response?.data?.message || error?.message || "Failed to save payment.", variant: "destructive" });
    }
  };

  if (loading && id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PaymentForm
        isOpen={true}
        onClose={() => navigate("/finance")}
        onSubmit={handleSubmit}
        initialData={initialData}
        mode={mode}
        invoice={invoiceFromState}
        availableInvoices={availableInvoices}
        embedPage={true}
      />
    </div>
  );
}
