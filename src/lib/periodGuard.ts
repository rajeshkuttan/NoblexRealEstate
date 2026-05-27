import { toast } from "sonner";
import { companyFinanceAPI } from "@/services/api";

export const PERIOD_CLOSED_MESSAGE = "This financial period is closed";

export async function checkPeriodOpenForDate(
  date: string | Date | undefined | null
): Promise<boolean> {
  if (!date) return true;
  try {
    const dateStr =
      typeof date === "string" ? date.slice(0, 10) : date.toISOString().slice(0, 10);
    const res = await companyFinanceAPI.getCurrentPeriodStatus(dateStr);
    const data = res.data?.data;
    if (data && data.canPost === false) {
      toast.error(PERIOD_CLOSED_MESSAGE);
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

export function periodClosedToast() {
  toast.error(PERIOD_CLOSED_MESSAGE);
}
