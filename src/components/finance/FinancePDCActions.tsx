import { useState, useEffect } from "react";
import { FileCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import PDCManagement from "@/components/finance/PDCManagement";
import PDCOpeningBalanceImport from "@/components/finance/PDCOpeningBalanceImport";

interface FinancePDCActionsProps {
  className?: string;
  showHelp?: boolean;
  /** Open PDC register modal on mount (e.g. dedicated /finance/pdc page). */
  defaultOpenRegister?: boolean;
}

export default function FinancePDCActions({
  className,
  showHelp = false,
  defaultOpenRegister = false,
}: FinancePDCActionsProps) {
  const [showPDCManagement, setShowPDCManagement] = useState(defaultOpenRegister);
  const [showPDCOpeningImport, setShowPDCOpeningImport] = useState(false);
  const [pdcRefreshKey, setPdcRefreshKey] = useState(0);

  useEffect(() => {
    if (defaultOpenRegister) {
      setShowPDCManagement(true);
    }
  }, [defaultOpenRegister]);

  return (
    <>
      {showHelp && (
        <p className="text-xs text-muted-foreground mt-2 max-w-2xl">
          PDC opening: set the PDC account debit in Chart of Accounts → Opening Balances, then import
          individual cheques via PDC Opening Balance (no GL). Depositing a cheque posts Dr Bank / Cr PDC.
        </p>
      )}
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPDCManagement(true)}
          className="flex-1 md:flex-none"
        >
          <FileCheck className="h-4 w-4 mr-2" />
          PDC Register
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPDCOpeningImport(true)}
          className="flex-1 md:flex-none"
        >
          <Upload className="h-4 w-4 mr-2" />
          PDC Opening Balance
        </Button>
      </div>

      {showPDCManagement && (
        <PDCManagement
          key={pdcRefreshKey}
          isOpen={showPDCManagement}
          onClose={() => setShowPDCManagement(false)}
        />
      )}

      <PDCOpeningBalanceImport
        open={showPDCOpeningImport}
        onOpenChange={setShowPDCOpeningImport}
        onImportComplete={() => setPdcRefreshKey((k) => k + 1)}
      />
    </>
  );
}
