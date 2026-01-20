import { useState, useRef } from "react";
import { Download, Printer, Mail, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import PDCEditor from "./PDCEditor"; // assuming this still exists

interface LeaseAgreementProps {
  lease: any; // You should strongly type this in real project
  onClose?: () => void;
}

export default function LeaseAgreement({
  lease,
  onClose,
}: LeaseAgreementProps) {
  const [showPDCEditor, setShowPDCEditor] = useState(false);
  const agreementRef = useRef<HTMLDivElement>(null);

  // ── Helper formatters ───────────────────────────────────────────────
  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-AE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount?: string | number) => {
    const value = Number(amount || 0);
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const calculateDurationMonths = (start?: string, end?: string) => {
    if (!start || !end) return "—";
    const s = new Date(start);
    const e = new Date(end);
    return (
      (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth())
    );
  };

  // Derived values
  const monthlyRent = Number(lease.rentAmount || 0);
  const annualRent = monthlyRent * 12;
  const durationMonths = calculateDurationMonths(
    lease.startDate,
    lease.endDate,
  );

  const property = lease.unit?.property || {};
  const unit = lease.unit || {};

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto bg-white text-black print:p-0 print:max-w-none">
      {/* Action Buttons - hidden when printing */}
      <div className="flex flex-wrap justify-between items-center gap-3 print:hidden">
        <div>
          <h2 className="text-2xl font-bold">Lease Agreement</h2>
          <p className="text-muted-foreground">
            #{lease.id} • {property.title || "—"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPDCEditor(true)}
            size="sm"
          >
            <FileCheck className="h-4 w-4 mr-2" />
            Edit PDC
          </Button>

          <Button variant="outline" onClick={() => window.print()} size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              const subject = `Lease Agreement - #${lease.id}`;
              const body = `Lease for ${property.title || "property"} - Unit ${unit.unitNumber || "—"}`;
              window.open(
                `mailto:${lease.tenant?.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
              );
            }}
            size="sm"
          >
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
        </div>
      </div>

      {/* ── Printable Content ────────────────────────────────────────────── */}
      <div ref={agreementRef} className="print:shadow-none">
        {/* Header */}
        <div className="text-center border-b-2 border-blue-700 pb-6 mb-8">
          <h1 className="text-3xl font-bold text-blue-800 mb-1">
            LEASE AGREEMENT
          </h1>
          <p className="text-lg text-gray-600">United Arab Emirates</p>
          <p className="text-sm text-gray-500 mt-1">Lease ID: #{lease.id}</p>
          <p className="text-sm text-gray-500">
            Date: {formatDate(lease.startDate)}
          </p>
        </div>

        {/* Parties */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-blue-700 border-b border-gray-300 pb-2 mb-4">
            PARTIES
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Landlord */}
            <div className="border rounded-lg p-5 bg-gray-50">
              <h3 className="font-semibold text-blue-700 mb-3">LANDLORD</h3>
              <div className="space-y-1.5 text-sm">
                <p>
                  <strong>Name:</strong> PropManage UAE Properties LLC
                </p>
                <p>
                  <strong>Address:</strong> Business Bay, Dubai, UAE
                </p>
                <p>
                  <strong>Phone:</strong> +971 4 123 4567
                </p>
                <p>
                  <strong>Email:</strong> info@propmanage.ae
                </p>
              </div>
            </div>

            {/* Tenant */}
            <div className="border rounded-lg p-5 bg-gray-50">
              <h3 className="font-semibold text-blue-700 mb-3">TENANT</h3>
              <div className="space-y-1.5 text-sm">
                <p>
                  <strong>Name:</strong> {lease.tenant?.name || "—"}
                </p>
                <p>
                  <strong>Nationality:</strong>{" "}
                  {lease.tenant?.nationality || "—"}
                </p>
                <p>
                  <strong>Emirates ID:</strong>{" "}
                  {lease.tenant?.emiratesId || "—"}
                </p>
                <p>
                  <strong>Phone:</strong> {lease.tenant?.phone || "—"}
                </p>
                <p>
                  <strong>Email:</strong> {lease.tenant?.email || "—"}
                </p>
                <p>
                  <strong>Company:</strong> {lease.tenant?.company || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Property */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-blue-700 border-b border-gray-300 pb-2 mb-4">
            PROPERTY DETAILS
          </h2>
          <div className="border rounded-lg p-5 bg-gray-50">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Property</h4>
                <p>
                  <strong>Building:</strong> {property.title || "—"}
                </p>
                <p>
                  <strong>Unit:</strong> {unit.unitNumber || "—"}
                </p>
                <p>
                  <strong>Type:</strong>{" "}
                  {unit.type?.charAt(0).toUpperCase() + unit.type?.slice(1) ||
                    "—"}
                </p>
                <p>
                  <strong>Area:</strong> {unit.area || "—"}{" "}
                  {unit.areaUnit || "sqft"}
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Features</h4>
                <p>
                  <strong>Bedrooms:</strong> {unit.bedrooms || "—"}
                </p>
                <p>
                  <strong>Bathrooms:</strong> {unit.bathrooms || "—"}
                </p>
                <p>
                  <strong>Parking:</strong>{" "}
                  {unit.parking ? "Available" : "Not Available"}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p>
                <strong>Location:</strong> {property.location || "—"},{" "}
                {property.community || "—"}
              </p>
              <p>
                <strong>Emirate:</strong>{" "}
                {property.emirate?.charAt(0).toUpperCase() +
                  property.emirate?.slice(1) || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Lease Terms & Financials */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-blue-700 border-b border-gray-300 pb-2 mb-4">
            LEASE TERMS & FINANCIAL SUMMARY
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Terms */}
            <div className="border rounded-lg p-5 bg-gray-50">
              <h4 className="font-semibold mb-3">Lease Period</h4>
              <div className="space-y-1.5 text-sm">
                <p>
                  <strong>Start Date:</strong> {formatDate(lease.startDate)}
                </p>
                <p>
                  <strong>End Date:</strong> {formatDate(lease.endDate)}
                </p>
                <p>
                  <strong>Duration:</strong> {durationMonths} months
                </p>
                <p>
                  <strong>Payment Frequency:</strong>{" "}
                  {lease.paymentFrequency || "—"}
                </p>
                <p>
                  <strong>Payment Day:</strong> {lease.paymentDay || "—"}
                </p>
              </div>
            </div>

            {/* Financial */}
            <div className="border rounded-lg p-5 bg-gray-50">
              <h4 className="font-semibold mb-3">Financials</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b">
                  <span>Monthly Rent:</span>
                  <strong>{formatCurrency(monthlyRent)}</strong>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span>Annual Rent:</span>
                  <strong>{formatCurrency(annualRent)}</strong>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span>Security Deposit:</span>
                  <strong>{formatCurrency(lease.depositAmount)}</strong>
                </div>
                <div className="flex justify-between py-1 font-bold text-blue-700">
                  <span>Total First Payment (Rent + Deposit):</span>
                  <span>
                    {formatCurrency(
                      monthlyRent + Number(lease.depositAmount || 0),
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Terms / Conditions */}
        {(lease.terms || lease.specialConditions) && (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-blue-700 border-b border-gray-300 pb-2 mb-4">
              TERMS & CONDITIONS
            </h2>
            <div className="border rounded-lg p-5 bg-gray-50 text-sm whitespace-pre-line">
              {lease.terms && <p className="mb-4">{lease.terms}</p>}
              {lease.specialConditions && <p>{lease.specialConditions}</p>}
            </div>
          </div>
        )}

        {/* Signatures */}
        <div className="mt-16 grid md:grid-cols-2 gap-12">
          <div className="text-center">
            <div className="border-b border-gray-400 h-16 mb-2"></div>
            <p className="font-medium">LANDLORD</p>
            <p className="text-sm text-gray-600">
              PropManage UAE Properties LLC
            </p>
            <p className="text-sm text-gray-500">Date: _______________</p>
          </div>

          <div className="text-center">
            <div className="border-b border-gray-400 h-16 mb-2"></div>
            <p className="font-medium">TENANT</p>
            <p className="text-sm text-gray-600">{lease.tenant?.name || "—"}</p>
            <p className="text-sm text-gray-500">Date: _______________</p>
          </div>
        </div>

        <div className="text-center text-xs text-gray-500 mt-12 print:mt-8">
          <p>
            This agreement is governed by the laws of the United Arab Emirates.
          </p>
          <p>
            Generated on {new Date().toLocaleDateString("en-AE")} • Lease ID #
            {lease.id}
          </p>
        </div>
      </div>

      {/* PDC Editor Modal (if you still use it) */}
      {showPDCEditor && (
        <PDCEditor
          isOpen={showPDCEditor}
          onClose={() => setShowPDCEditor(false)}
          lease={lease}
          onSave={(data) => {
            console.log("Saved PDC:", data);
            setShowPDCEditor(false);
          }}
        />
      )}
    </div>
  );
}
