import { ReportDashboard } from "@/components/report-dashboard";
import { getReportData } from "@/lib/reporting";
import type { ReportData } from "@/lib/reporting";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

type Filters = {
  orgId: string;
  startDate: string;
  endDate: string;
  metrics: string[];
};

const DEFAULT_FILTERS: Filters = {
  orgId: "1",
  startDate: "2026-01-27",
  endDate: new Date().toISOString().slice(0, 10),
  metrics: ["revenue", "total_spend", "profit", "roas"],
};

function parseFilters(params: Awaited<SearchParams>): Filters {
  const metricsParam = params.metrics ? String(params.metrics) : "";
  const parsedMetrics = metricsParam
    .split(",")
    .map((metric) => metric.trim())
    .filter(Boolean);

  return {
    orgId: params.orgId ? String(params.orgId) : DEFAULT_FILTERS.orgId,
    startDate: params.startDate ? String(params.startDate) : DEFAULT_FILTERS.startDate,
    endDate: params.endDate ? String(params.endDate) : DEFAULT_FILTERS.endDate,
    metrics: parsedMetrics.length > 0 ? parsedMetrics : DEFAULT_FILTERS.metrics,
  };
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters = parseFilters(params);

  let initialData: ReportData | null = null;
  try {
    initialData = await getReportData({
      orgId: Number(filters.orgId),
      startDate: filters.startDate,
      endDate: filters.endDate,
      metrics: filters.metrics,
    });
  } catch { }

  return (
    <div className="flex w-full flex-1 flex-col items-center mt-23">
      <div className="w-full max-w-7xl flex flex-col gap-2 px-4 lg:px-6">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <ReportDashboard filters={filters} initialReportData={initialData} />
        </div>
      </div>
    </div>
  );
}
