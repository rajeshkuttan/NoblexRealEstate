import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const now = new Date();

export function usePayrollPeriod() {
  const [searchParams, setSearchParams] = useSearchParams();

  const month = useMemo(() => {
    const m = Number(searchParams.get("month"));
    return m >= 1 && m <= 12 ? m : now.getMonth() + 1;
  }, [searchParams]);

  const year = useMemo(() => {
    const y = Number(searchParams.get("year"));
    return y >= 2000 && y <= 2100 ? y : now.getFullYear();
  }, [searchParams]);

  const setPeriod = useCallback(
    (nextMonth: number, nextYear: number) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set("month", String(nextMonth));
          p.set("year", String(nextYear));
          return p;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const periodParams = useMemo(() => ({ month, year }), [month, year]);

  return { month, year, setPeriod, periodParams };
}
