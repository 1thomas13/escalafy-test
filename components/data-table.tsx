"use client";

import { useEffect, useMemo, useState } from "react";
import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
const DECIMAL_METRICS = new Set(["roas", "average_order_value", "meta_cpm", "google_cpm"]);
const PAGE_SIZES = [10, 20, 30, 40, 50];

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

type DataTableProps = {
  reportData?: ReportData | null;
  filters?: Filters;
};

export function DataTable({ reportData, filters }: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const selectedMetrics = filters?.metrics ?? [];

  const sortedRows = useMemo(
    () => [...(reportData?.daily ?? [])].sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [reportData?.daily],
  );

  useEffect(() => setCurrentPage(0), [reportData?.daily, filters?.metrics?.join(",")]);

  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;
  const paginatedRows = sortedRows.slice(currentPage * pageSize, currentPage * pageSize + pageSize);
  const canGoPrevious = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24 px-3 py-2">Date</TableHead>
              {selectedMetrics.map((metricId, index) => (
                <TableHead
                  key={metricId}
                  className={`px-3 py-2 text-right font-medium ${index < selectedMetrics.length - 1 ? "border-r border-border/40" : ""}`}
                >
                  {getMetricLabel(metricId)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={selectedMetrics.length + 1} className="h-24 px-3 text-center text-muted-foreground">
                  No data found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row) => (
                <TableRow key={String(row.date)}>
                  <TableCell className="w-24 border-r border-border/60 px-3 py-2 font-medium">
                    {String(row.date)}
                  </TableCell>
                  {selectedMetrics.map((metricId, index) => (
                    <TableCell
                      key={metricId}
                      className={`px-3 py-2 text-right tabular-nums ${index < selectedMetrics.length - 1 ? "border-r border-border/40" : ""} ${CURRENCY_METRICS.has(metricId) ? "font-medium" : ""}`}
                    >
                      {formatMetricValue(metricId, Number(row[metricId] ?? 0))}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {sortedRows.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">Rows</Label>
            <Select
              value={String(pageSize)}
              onValueChange={(selectedSize) => { setPageSize(Number(selectedSize)); setCurrentPage(0); }}
            >
              <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-full items-center justify-center gap-2 text-sm font-medium lg:w-fit">
            <Button variant="outline" size="icon" className="hidden h-8 w-8 lg:flex" onClick={() => setCurrentPage(0)} disabled={!canGoPrevious} aria-label="First page">
              <IconChevronsLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage((page) => Math.max(0, page - 1))} disabled={!canGoPrevious} aria-label="Previous page">
              <IconChevronLeft className="size-4" />
            </Button>
            <span>Page {currentPage + 1} of {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage((page) => Math.min(totalPages - 1, page + 1))} disabled={!canGoNext} aria-label="Next page">
              <IconChevronRight className="size-4" />
            </Button>
            <Button variant="outline" size="icon" className="hidden h-8 w-8 lg:flex" onClick={() => setCurrentPage(totalPages - 1)} disabled={!canGoNext} aria-label="Last page">
              <IconChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
