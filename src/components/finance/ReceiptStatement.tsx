import React from "react";
import { Printer, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ReceiptStatementProps {
  receipts: any[];
  isOpen: boolean;
  onClose: () => void;
  searchQuery?: string;
}

export default function ReceiptStatement({ receipts, isOpen, onClose, searchQuery }: ReceiptStatementProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: any) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-AE", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const totalAmount = receipts.reduce((sum, rec) => sum + parseFloat(rec.amount || 0), 0);
  
  const companyInfo = {
    name: "Emirates Lease Flow",
    license: "L-123456",
    address: "Business Bay, Dubai, UAE",
    phone: "+971 4 000 0000",
    email: "info@emirateslease.ae",
    vatNumber: "100123456789123"
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl">
        <div className="flex flex-col h-full bg-white relative">
          {/* Action Header (Hidden in Print) */}
          <div className="flex items-center justify-between p-4 border-b bg-slate-50 sticky top-0 z-10 print:hidden">
            <div className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              <DialogTitle className="text-lg font-bold">Print Receipt Statement</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="default" onClick={() => window.print()} className="bg-primary hover:bg-primary/90">
                <Printer className="h-4 w-4 mr-2" />
                Print Statement
              </Button>
              <Button variant="outline" onClick={onClose} size="icon" className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              .printable-area, .printable-area * {
                visibility: visible !important;
              }
              .printable-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 15mm !important;
                background: white !important;
                z-index: 99999 !important;
              }
              .print\\:hidden {
                display: none !important;
              }
              @page {
                size: A4;
                margin: 0;
              }
              /* Fix table borders in print */
              table {
                border-collapse: collapse !important;
                width: 100% !important;
              }
              th, td {
                border: 1px solid #e2e8f0 !important;
                padding: 8px !important;
              }
              .bg-slate-50 {
                background-color: #f8fafc !important;
                -webkit-print-color-adjust: exact;
              }
              .text-primary {
                color: #2563eb !important;
                -webkit-print-color-adjust: exact;
              }
            }
          `}</style>

          {/* Printable Area */}
          <div className="printable-area p-8 text-slate-800 bg-white">
            {/* Header */}
            <div className="flex justify-between items-start mb-10 border-b-2 border-primary pb-6">
              <div className="space-y-1">
                <h1 className="text-3xl font-black text-primary tracking-tight uppercase italic flex items-center gap-2">
                  <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center text-white not-italic">
                    ELF
                  </div>
                  {companyInfo.name}
                </h1>
                <p className="text-sm text-slate-500 font-medium">{companyInfo.address}</p>
                <div className="flex items-center gap-4 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Tel: {companyInfo.phone}</span>
                  <span>Email: {companyInfo.email}</span>
                </div>
              </div>
              <div className="text-right space-y-2">
                <div className="bg-primary/5 text-primary border border-primary/10 px-4 py-2 rounded-xl inline-block">
                  <h2 className="text-xl font-bold uppercase tracking-widest">Receipt Statement</h2>
                </div>
                <div className="text-xs font-bold text-slate-500 space-y-1">
                  <p>Date: {new Date().toLocaleDateString("en-AE", { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p>TRN: {companyInfo.vatNumber}</p>
                </div>
              </div>
            </div>

            {/* Statement Info */}
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl mb-8 flex justify-between items-center shadow-sm">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Customer / Search Query</p>
                <p className="text-xl font-bold text-slate-900 capitalize">{searchQuery || "All Customers"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Received</p>
                <p className="text-3xl font-black text-primary">{formatCurrency(totalAmount)}</p>
              </div>
            </div>

            {/* Receipt Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="font-black text-slate-600 uppercase tracking-wider text-[10px] h-10">Date</TableHead>
                    <TableHead className="font-black text-slate-600 uppercase tracking-wider text-[10px] h-10">Receipt No</TableHead>
                    <TableHead className="font-black text-slate-600 uppercase tracking-wider text-[10px] h-10">Customer / Payee</TableHead>
                    <TableHead className="font-black text-slate-600 uppercase tracking-wider text-[10px] h-10">Method</TableHead>
                    <TableHead className="font-black text-slate-600 uppercase tracking-wider text-[10px] h-10">Reference</TableHead>
                    <TableHead className="font-black text-slate-600 uppercase tracking-wider text-[10px] h-10 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((rec, index) => (
                    <TableRow key={rec.id} className={index % 2 === 1 ? "bg-slate-50/30" : ""}>
                      <TableCell className="text-sm font-medium">{formatDate(rec.paymentDate)}</TableCell>
                      <TableCell className="text-sm font-bold text-slate-900">{rec.paymentNumber}</TableCell>
                      <TableCell>
                        <div className="text-sm font-semibold">{rec.tenantName || rec.tenant?.name || rec.payeeName}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">{rec.payeeType || "Tenant"}</div>
                      </TableCell>
                      <TableCell className="text-[10px] font-black uppercase text-slate-500">{rec.paymentMethod?.replace('_', ' ')}</TableCell>
                      <TableCell className="font-mono text-[10px] text-slate-400">{rec.paymentReference || "—"}</TableCell>
                      <TableCell className="text-right text-sm font-black text-slate-900">{formatCurrency(rec.amount)}</TableCell>
                    </TableRow>
                  ))}
                  {receipts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-slate-400 font-medium">No receipts found for this selection.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Total Footer */}
            <div className="mt-10 flex justify-end">
              <div className="w-64 space-y-3">
                <div className="flex justify-between items-center px-4 py-2 border-b border-slate-100">
                  <span className="text-sm font-semibold text-slate-500 italic">Sub-Total:</span>
                  <span className="text-sm font-bold">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-4 bg-primary text-white rounded-xl shadow-lg shadow-primary/20">
                  <span className="font-black uppercase tracking-widest text-xs">Total AED:</span>
                  <span className="text-xl font-black">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Signature Section */}
            <div className="mt-20 grid grid-cols-2 gap-20">
              <div className="text-center">
                <div className="border-b border-slate-300 h-10 mb-2"></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Customer Signature</p>
              </div>
              <div className="text-center">
                <div className="border-b border-slate-300 h-10 mb-2"></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Authorized Signatory</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-20 pt-8 border-t border-slate-100 text-center text-[10px] text-slate-400 font-semibold space-y-1">
              <p>Thank you for choosing {companyInfo.name}. This is a computer-generated statement.</p>
              <p>Generated on {new Date().toLocaleString("en-AE")} • Page 1 of 1</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
