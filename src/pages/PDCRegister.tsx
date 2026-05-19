import FinancePDCActions from "@/components/finance/FinancePDCActions";

export default function PDCRegister() {
  return (
    <div className="space-y-6 uiux-page-enter">
      <div className="uiux-page-header flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex-1">
          <h1 className="uiux-page-title">PDC Register</h1>
          <p className="uiux-page-subtitle">
            Import opening balance cheques, deposit to bank, and manage post-dated cheques
          </p>
          <FinancePDCActions showHelp defaultOpenRegister className="mt-4" />
        </div>
      </div>
    </div>
  );
}
