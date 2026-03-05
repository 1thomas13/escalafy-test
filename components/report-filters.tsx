"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Filters = {
  orgId: string;
  startDate: string;
  endDate: string;
  metrics: string[];
};

const METRIC_GROUPS = [
  { title: "Revenue & Orders", metrics: [{ id: "revenue", label: "Revenue" }, { id: "orders", label: "Orders" }, { id: "fees", label: "Fees" }] },
  { title: "Meta Ads", metrics: [{ id: "meta_spend", label: "Meta Spend" }, { id: "meta_impressions", label: "Meta Impressions" }, { id: "meta_cpm", label: "Meta CPM" }] },
  { title: "Google Ads", metrics: [{ id: "google_spend", label: "Google Spend" }, { id: "google_impressions", label: "Google Impressions" }, { id: "google_cpm", label: "Google CPM" }] },
  { title: "Performance", metrics: [{ id: "total_spend", label: "Total Spend" }, { id: "profit", label: "Profit" }, { id: "roas", label: "ROAS" }, { id: "average_order_value", label: "AOV" }] },
];

const ORGANIZATIONS = [
  { id: 1, name: "Acme Corp" },
  { id: 2, name: "Globex Inc" },
];

const DEBOUNCE_MS = { metrics: 120, dates: 300 };

export function ReportFilters({ value, onChange }: { value: Filters; onChange: (filters: Filters) => void }) {
  const [selectedMetrics, setSelectedMetrics] = useState(value.metrics);
  const [localStartDate, setLocalStartDate] = useState(value.startDate);
  const [localEndDate, setLocalEndDate] = useState(value.endDate);
  const metricsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const datesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentValue = useRef(value);
  currentValue.current = value;

  useEffect(() => {
    if (metricsTimer.current) clearTimeout(metricsTimer.current);
    if (datesTimer.current) clearTimeout(datesTimer.current);
    setSelectedMetrics(value.metrics);
    setLocalStartDate(value.startDate);
    setLocalEndDate(value.endDate);
  }, [value.orgId, value.startDate, value.endDate]);

  useEffect(() => () => {
    if (metricsTimer.current) clearTimeout(metricsTimer.current);
    if (datesTimer.current) clearTimeout(datesTimer.current);
  }, []);

  const applyChanges = useCallback(
    (updates: Partial<Filters>) => onChange({ ...currentValue.current, ...updates }),
    [onChange],
  );

  const applyWithDebounce = useCallback(
    (updates: Partial<Filters>, type: "metrics" | "dates") => {
      const timerRef = type === "metrics" ? metricsTimer : datesTimer;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        applyChanges(updates);
      }, DEBOUNCE_MS[type]);
    },
    [applyChanges],
  );

  const handleMetricToggle = (metricId: string, isChecked: boolean) => {
    const nextMetrics = isChecked
      ? [...selectedMetrics, metricId]
      : selectedMetrics.filter((metric) => metric !== metricId);
    if (nextMetrics.length === 0) return;
    setSelectedMetrics(nextMetrics);
    applyWithDebounce({ metrics: nextMetrics }, "metrics");
  };

  const handleStartDateChange = (newStartDate: string) => {
    const adjustedEndDate = newStartDate > currentValue.current.endDate
      ? newStartDate
      : currentValue.current.endDate;
    setLocalStartDate(newStartDate);
    if (newStartDate > currentValue.current.endDate) setLocalEndDate(newStartDate);
    applyWithDebounce({ startDate: newStartDate, endDate: adjustedEndDate }, "dates");
  };

  const handleEndDateChange = (newEndDate: string) => {
    setLocalEndDate(newEndDate);
    applyWithDebounce({ endDate: newEndDate }, "dates");
  };

  return (
    <div className="flex flex-col gap-6 rounded-lg border bg-linear-to-t from-primary/5 to-card p-4 shadow-sm lg:px-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="organization">Organization</Label>
          <Select value={value.orgId} onValueChange={(orgId) => applyChanges({ orgId })}>
            <SelectTrigger id="organization" className="w-[200px]">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {ORGANIZATIONS.map((org) => (
                <SelectItem key={org.id} value={String(org.id)}>{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="start-date">Start date</Label>
          <Input
            id="start-date"
            type="date"
            value={localStartDate}
            onChange={(event) => handleStartDateChange(event.target.value)}
            className="w-[160px]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="end-date">End date</Label>
          <Input
            id="end-date"
            type="date"
            min={localStartDate}
            value={localEndDate}
            onChange={(event) => handleEndDateChange(event.target.value)}
            className="w-[160px]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Label>Metrics</Label>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {METRIC_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {group.title}
              </span>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {group.metrics.map((metric) => (
                  <div key={metric.id} className="flex items-center gap-2">
                    <Checkbox
                      id={metric.id}
                      checked={selectedMetrics.includes(metric.id)}
                      onCheckedChange={(checked) => handleMetricToggle(metric.id, checked === true)}
                    />
                    <Label htmlFor={metric.id} className="cursor-pointer text-sm font-normal">
                      {metric.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
