import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { paymentsAPI, invoicesAPI } from "@/services/api";
import PaymentForm from "@/components/finance/PaymentForm";
import { toast } from "sonner";

export default function RecordPaymentPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
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
          id ? paymentsAPI.getById(Number(id), true).catch(() => ({ data: {} })) : Promise.resolve({ data: null }),
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
      
      const sanitizeDate = (date: any) => {
        if (!date || date === "" || String(date).toLowerCase().includes("invalid")) return null;
        return date;
      };

      const backendPayload: any = {
        paymentNumber: data.paymentNumber,
        paymentType: data.paymentType,
        paymentDate: sanitizeDate(data.paymentDate),
        amount: data.paymentDetails?.amount,
        paymentMethod: mappedMethod,
        reference: data.paymentDetails?.paymentReference,
        status: mappedStatus,
        notes: data.notes,
        description: data.paymentPurpose?.description,
        bankDetails: data.paymentDetails?.bankDetails,
        category: data.paymentPurpose?.category,
        dueDate: sanitizeDate(data.paymentDate),
        
        // New Persistence Fields
        payeeType: data.payeeInfo?.payeeType,
        payeeName: data.payeeInfo?.payeeName,
        payeeIdString: data.payeeInfo?.payeeId,
        propertyName: data.paymentPurpose?.property,
        unitNumber: data.paymentPurpose?.unit,
        instrumentNumber: data.paymentDetails?.instrumentNumber || null,
        instrumentDate: sanitizeDate(data.paymentDetails?.instrumentDate),
        pettyCashAccount: data.paymentDetails?.pettyCashAccount || null,
        bankName: data.paymentDetails?.bankName || null,
        processedByName: data.processedBy,
        approvedByName: data.approvedBy,
        taxInfo: data.taxInfo,

        // Balancing the Journal Entries (Double Entry Logic)
        details: (() => {
          const entries = [...(data.details || [])];
          const totalDebit = entries.reduce((sum, e) => sum + (e.drCr === 'Dr' ? (Number(e.amount) || 0) : 0), 0);
          const totalCredit = entries.reduce((sum, e) => sum + (e.drCr === 'Cr' ? (Number(e.amount) || 0) : 0), 0);
          
          if (Math.abs(totalDebit - totalCredit) > 0.001) {
            // Need to add the balancing side (usually the Bank/Cash/Source side)
            const balance = Math.abs(totalDebit - totalCredit);
            const side = totalDebit > totalCredit ? 'Cr' : 'Dr';
            
            // Determine ledger for the balancing side
            let ledgerId = "";
            let particular = "";
            
            if (data.paymentDetails?.paymentMethod === "cash") {
              ledgerId = data.paymentDetails?.pettyCashAccount || "";
              particular = "Cash";
            } else if (["bank_transfer", "cheque", "online_payment", "pdc", "credit_card"].includes(data.paymentDetails?.paymentMethod)) {
              // Use the actual ledger ID selected in bankAccount
              ledgerId = data.paymentDetails?.bankAccount || "";
              particular = "Bank";
            }

            entries.push({
              drCr: side,
              particular: particular || "Bank/Cash",
              ledger: ledgerId,
              amount: balance,
              bill: "none",
              narration: data.paymentPurpose?.description || "Payment balancing entry"
            });
          }
          return entries;
        })(),
      };

      // Add conditional IDs based on payment type
      if (data.paymentType === "invoice_payment") {
        backendPayload.invoiceId = data.invoice?.id;
        backendPayload.leaseId = data.invoice?.leaseId;
        backendPayload.tenantId = data.invoice?.tenantId;
        
        if (!backendPayload.leaseId || !backendPayload.tenantId) {
          toast.error("Lease and Tenant information is required for invoice payments.");
          return;
        }
      } else if (data.paymentType === "supplier_payment") {
        backendPayload.vendorId = data.payeeInfo?.payeeId;
        if (!backendPayload.vendorId) {
          toast.error("Please select a supplier.");
          return;
        }
      }

      if (mode === "create") {
        await paymentsAPI.create(backendPayload);
        toast.success("Payment recorded successfully!");
      } else if (id) {
        await paymentsAPI.update(Number(id), backendPayload);
        toast.success("Payment updated successfully!");
      }
      navigate("/finance", { state: { activeTab: "payments" } });
    } catch (error: any) {
      console.error("Error saving payment:", error);
      toast.error(error?.response?.data?.message || error?.message || "Failed to save payment.");
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
    <div className="space-y-6 uiux-page-enter">
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
