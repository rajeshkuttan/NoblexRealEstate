import { useQuery } from "@tanstack/react-query";
import { investmentsAPI } from "@/services/api";

/** RC1 coexistence banner for investment entry surfaces. */
export function InvestmentV2ReleaseBanner() {
  const { data } = useQuery({
    queryKey: ["investment-v2-release-status"],
    queryFn: async () => {
      const res = await investmentsAPI.getInvestmentV2ReleaseStatus();
      return res.data?.data || res.data;
    },
    staleTime: 60_000,
  });

  if (!data) return null;

  const legacyRo = data.legacyEntryMode === "read_only" || data.legacyEntryMode === "disabled";
  const pilot = data.omsEntryMode === "pilot";

  let message = "";
  if (legacyRo) {
    message =
      "Legacy Phase 15 entry is read-only. Create new activity via OMS (Orders / Trades). Break-glass requires emergency permission.";
  } else if (pilot) {
    message =
      "Investment 2.0 RC1 pilot: OMS entry is restricted to allow-listed users. Legacy entry remains available — provide a reason when prompted. Market data is manual/import; sanctions are provider-reference.";
  } else {
    message = `Investment 2.0 (${data.releaseStage}): OMS=${data.omsEntryMode}, Legacy=${data.legacyEntryMode}. Market data: ${data.marketDataMode}.`;
  }

  return (
    <div
      className="mb-4 rounded-md border border-amber-700/30 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"
      role="status"
    >
      {message}
    </div>
  );
}
