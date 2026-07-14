import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NobleXPageHeader, NobleXDataTable } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { investmentsAPI } from "@/services/api";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export default function InvestmentPortfoliosPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["investment-portfolios-v2", page],
    queryFn: async () => {
      const res = await investmentsAPI.listPortfoliosV2({ page, limit: 20 });
      return res.data?.data || { portfolios: [], pagination: {} };
    },
  });

  const create = async () => {
    if (!name.trim()) {
      toast.error(t("investments.portfolios.nameRequired"));
      return;
    }
    try {
      await investmentsAPI.createPortfolioV2({ portfolioName: name.trim() });
      toast.success(t("investments.portfolios.created"));
      setName("");
      qc.invalidateQueries({ queryKey: ["investment-portfolios-v2"] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t("investments.portfolios.createFailed"));
    }
  };

  const portfolios = data?.portfolios || [];
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-6 p-1">
      <NobleXPageHeader
        title={t("investments.portfolios.title")}
        subtitle={t("investments.portfolios.subtitle")}
      />
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <Input
            placeholder={t("investments.portfolios.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-64"
          />
        </div>
        <Button type="button" onClick={create}>
          {t("investments.portfolios.create")}
        </Button>
        <Button type="button" variant="outline" onClick={() => refetch()}>
          {t("investments.portfolios.refresh")}
        </Button>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">{t("investments.portfolios.loading")}</p>}
      {isError && (
        <p className="text-sm text-destructive">
          {t("investments.portfolios.loadFailed")}{" "}
          <button type="button" className="underline" onClick={() => refetch()}>
            {t("investments.portfolios.retry")}
          </button>
        </p>
      )}
      {!isLoading && portfolios.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">{t("investments.portfolios.empty")}</p>
      )}
      {portfolios.length > 0 && (
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>{t("investments.portfolios.columns.code")}</TableHead>
              <TableHead>{t("investments.portfolios.columns.name")}</TableHead>
              <TableHead>{t("investments.portfolios.columns.currency")}</TableHead>
              <TableHead>{t("investments.portfolios.columns.status")}</TableHead>
              <TableHead>{t("investments.portfolios.columns.books")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {portfolios.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-sm">{p.portfolioCode}</TableCell>
                <TableCell>{p.portfolioName}</TableCell>
                <TableCell>{p.reportingCurrency}</TableCell>
                <TableCell>{p.status}</TableCell>
                <TableCell>{p.books?.length ?? 0}</TableCell>
                <TableCell>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/investments/portfolios/${p.id}`}>{t("investments.portfolios.open360")}</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </NobleXDataTable>
      )}
      {pagination.totalPages > 1 && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t("investments.pagination.previous")}
          </Button>
          <span className="text-sm self-center">
            {t("investments.pagination.pageOf", { page: pagination.page, total: pagination.totalPages })}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("investments.pagination.next")}
          </Button>
        </div>
      )}
    </div>
  );
}
