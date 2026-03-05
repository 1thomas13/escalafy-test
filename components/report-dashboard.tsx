"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ReportFilters } from "@/components/report-filters";
import { DataTable } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReportData } from "@/lib/reporting";

type Filters = {
  orgId: string;
  startDate: string;
  endDate: string;
  metrics: string[];
};

const METRIC_LABELS: Record<string, string> = {
  revenue: "Revenue",
  orders: "Orders",
  fees: "Fees",
  meta_spend: "Meta Spend",
  meta_impressions: "Meta Impressions",
  google_spend: "Google Spend",
  google_impressions: "Google Impressions",
  total_spend: "Total Spend",
  profit: "Profit",
  roas: "ROAS",
  average_order_value: "AOV",
  meta_cpm: "Meta CPM",
  google_cpm: "Google CPM",
};

const CURRENCY_METRICS = new Set(["revenue", "fees", "meta_spend", "google_spend", "total_spend", "profit"]);
const DECIMAL_METRICS = new Set(["roas", "meta_cpm", "google_cpm", "average_order_value"]);

function formatMetricValue(metricId: string, value: number): string {
  if (!Number.isFinite(value)) return "-";
  if (CURRENCY_METRICS.has(metricId)) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: DECIMAL_METRICS.has(metricId) ? 2 : 0 }).format(value);
}

function getMetricLabel(metricId: string): string {
  return METRIC_LABELS[metricId] ?? metricId.replaceAll("_", " ");
}

export function ReportDashboard({ filters, initialReportData }: { filters: Filters; initialReportData?: ReportData | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [reportData, setReportData] = useState<ReportData | null>(initialReportData ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!initialReportData);

  useEffect(() => {
    if (initialReportData) {
      setReportData(initialReportData);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setError(null);
    setIsLoading(true);

    const queryParams = new URLSearchParams({
      orgId: filters.orgId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      metrics: filters.metrics.join(","),
    });

    fetch(`/api/reporting?${queryParams}`)
      .then((response) => {
        if (!response.ok) return response.json().then((body) => { throw new Error(body.error ?? "Failed to fetch"); });
        return response.json();
      })
      .then((data) => { if (!cancelled) { setReportData(data); setIsLoading(false); } })
      .catch((fetchError) => { if (!cancelled) { setError(fetchError.message); setReportData(null); setIsLoading(false); } });

    return () => { cancelled = true; };
  }, [filters.orgId, filters.startDate, filters.endDate, filters.metrics.join(","), initialReportData]);

  const handleFiltersChange = (newFilters: Filters) => {
    const queryParams = new URLSearchParams({
      orgId: newFilters.orgId,
      startDate: newFilters.startDate,
      endDate: newFilters.endDate,
      metrics: newFilters.metrics.join(","),
    });
    router.push(`${pathname}?${queryParams}`);
  };

  const totals = reportData?.totals ?? {};
  const selectedMetrics = filters.metrics;

  if (isLoading) {
    return (
      <>
        <ReportFilters value={filters} onChange={handleFiltersChange} />
        <div className="flex flex-col gap-4 md:gap-6">
          <div className="flex flex-wrap gap-3">
            {[1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-20 w-48 min-w-[180px] rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <ReportFilters value={filters} onChange={handleFiltersChange} />
        <div className="py-6 text-destructive">{error}</div>
      </>
    );
  }

  return (
    <>
      <ReportFilters value={filters} onChange={handleFiltersChange} />
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-wrap gap-3">
          {selectedMetrics.map((metricId) => (
            <div key={metricId} className="w-48 min-w-[180px] rounded-lg border bg-card p-4 shadow-sm">
              <div className="text-xs font-medium text-muted-foreground">{getMetricLabel(metricId)}</div>
              <div className="text-lg font-semibold tabular-nums">{formatMetricValue(metricId, Number(totals[metricId] ?? 0))}</div>
            </div>
          ))}
        </div>
        <DataTable reportData={reportData} filters={filters} />
      </div>
    </>
  );
}
