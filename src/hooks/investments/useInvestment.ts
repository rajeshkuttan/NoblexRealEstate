import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { investmentsAPI } from "@/services/api";
import { toast } from "sonner";

export function useInvestmentDashboard() {
  return useQuery({
    queryKey: ["investment-dashboard"],
    queryFn: async () => {
      const res = await investmentsAPI.getDashboard();
      return res.data?.data;
    },
  });
}

export function useInvestmentPortfolio(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["investment-portfolio", params],
    queryFn: async () => {
      const res = await investmentsAPI.getPortfolio(params);
      return res.data?.data;
    },
  });
}

export function useInvestmentAsset(id?: number) {
  return useQuery({
    queryKey: ["investment-asset", id],
    queryFn: async () => {
      const res = await investmentsAPI.getAsset(id!);
      return res.data?.data;
    },
    enabled: !!id,
  });
}

export function useInvestmentCategories() {
  return useQuery({
    queryKey: ["investment-categories"],
    queryFn: async () => {
      const res = await investmentsAPI.getCategories();
      return res.data?.data ?? [];
    },
  });
}

export function useInvestmentAccountSettings() {
  return useQuery({
    queryKey: ["investment-account-settings"],
    queryFn: async () => {
      const res = await investmentsAPI.getAccountSettings();
      return res.data?.data;
    },
  });
}

export function useInvestmentMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["investment-dashboard"] });
    qc.invalidateQueries({ queryKey: ["investment-portfolio"] });
    qc.invalidateQueries({ queryKey: ["investment-asset"] });
    qc.invalidateQueries({ queryKey: ["investment-transactions"] });
    qc.invalidateQueries({ queryKey: ["investment-asset-transactions"] });
    qc.invalidateQueries({ queryKey: ["investment-dividends"] });
  };

  const createAsset = useMutation({
    mutationFn: (data: unknown) => investmentsAPI.createAsset(data),
    onSuccess: () => { toast.success("Investment asset created"); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to create asset"),
  });

  const createTransaction = useMutation({
    mutationFn: (data: unknown) => investmentsAPI.createTransaction(data),
    onSuccess: () => { toast.success("Transaction recorded"); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to create transaction"),
  });

  const approveTransaction = useMutation({
    mutationFn: (id: number) => investmentsAPI.approveTransaction(id),
    onSuccess: () => { toast.success("Transaction approved"); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Approval failed"),
  });

  const postTransaction = useMutation({
    mutationFn: (id: number) => investmentsAPI.postTransaction(id),
    onSuccess: () => { toast.success("Posted to finance"); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Posting failed"),
  });

  const updateAccountSettings = useMutation({
    mutationFn: (data: unknown) => investmentsAPI.updateAccountSettings(data),
    onSuccess: () => { toast.success("Account settings saved"); qc.invalidateQueries({ queryKey: ["investment-account-settings"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Save failed"),
  });

  const updateAsset = useMutation({
    mutationFn: ({ id, data }: { id: number; data: unknown }) => investmentsAPI.updateAsset(id, data),
    onSuccess: () => { toast.success("Asset updated"); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Update failed"),
  });

  const cancelTransaction = useMutation({
    mutationFn: (id: number) => investmentsAPI.cancelTransaction(id),
    onSuccess: () => { toast.success("Transaction cancelled"); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Cancel failed"),
  });

  const rejectTransaction = useMutation({
    mutationFn: (id: number) => investmentsAPI.rejectTransaction(id),
    onSuccess: () => { toast.success("Transaction rejected"); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Reject failed"),
  });

  return { createAsset, createTransaction, approveTransaction, postTransaction, updateAccountSettings, updateAsset, cancelTransaction, rejectTransaction };
}
