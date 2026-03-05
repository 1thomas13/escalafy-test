import { sql } from "drizzle-orm";
import { db } from "@/app/api/db";

export type ReportData = {
  totals: Record<string, number>;
  daily: { date: string; [metric: string]: number | string }[];
};

export type ReportParams = {
  orgId: number;
  startDate: string;
  endDate: string;
  metrics: string[];
};

export const AVAILABLE_METRICS = [
  "meta_spend", "meta_impressions", "google_spend", "google_impressions",
  "revenue", "orders", "fees", "meta_cpm", "google_cpm", "average_order_value",
  "total_spend", "profit", "roas",
] as const;

const VALID_METRICS = new Set<string>(AVAILABLE_METRICS);

type RawRow = {
  date: string;
  meta_spend: number;
  meta_impressions: number;
  google_spend: number;
  google_impressions: number;
  revenue: number;
  orders: number;
  fees: number;
};

function safeDivide(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

const METRIC_FORMULAS: Record<string, (row: RawRow) => number> = {
  meta_spend: (row) => row.meta_spend,
  meta_impressions: (row) => row.meta_impressions,
  google_spend: (row) => row.google_spend,
  google_impressions: (row) => row.google_impressions,
  revenue: (row) => row.revenue,
  orders: (row) => row.orders,
  fees: (row) => row.fees,
  meta_cpm: (row) => safeDivide(row.meta_spend, row.meta_impressions) * 1000,
  google_cpm: (row) => safeDivide(row.google_spend, row.google_impressions) * 1000,
  average_order_value: (row) => safeDivide(row.revenue, row.orders),
  total_spend: (row) => row.meta_spend + row.google_spend,
  profit: (row) => row.revenue - row.meta_spend - row.google_spend - row.fees,
  roas: (row) => safeDivide(row.revenue, row.meta_spend + row.google_spend),
};

export function validateMetrics(metrics: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const metric of metrics) {
    if (VALID_METRICS.has(metric)) valid.push(metric);
    else invalid.push(metric);
  }
  return { valid, invalid };
}

function parseRawRow(row: Record<string, unknown>): RawRow {
  return {
    date: String(row.date),
    meta_spend: Number(row.meta_spend) || 0,
    meta_impressions: Number(row.meta_impressions) || 0,
    google_spend: Number(row.google_spend) || 0,
    google_impressions: Number(row.google_impressions) || 0,
    revenue: Number(row.revenue) || 0,
    orders: Number(row.orders) || 0,
    fees: Number(row.fees) || 0,
  };
}

function computeMetrics(row: RawRow, metrics: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const metric of metrics) {
    result[metric] = METRIC_FORMULAS[metric](row);
  }
  return result;
}

export async function getReportData(params: ReportParams): Promise<ReportData | null> {
  const { orgId, startDate, endDate, metrics: requestedMetrics } = params;
  const { valid: metrics } = validateMetrics(requestedMetrics);
  if (metrics.length === 0) return null;

  const query = sql<Record<string, unknown>>`
    WITH org AS (
      SELECT meta_account_id, google_account_id, store_id FROM organization WHERE id = ${orgId}
    ),
    dates AS (
      SELECT generate_series(${startDate}::date, ${endDate}::date, interval '1 day')::date AS day
    ),
    meta AS (
      SELECT m.date::date AS day, SUM(m.spend)::double precision AS meta_spend, SUM(m.impressions)::bigint AS meta_impressions
      FROM meta_ads_data m JOIN org o ON m.account_id = o.meta_account_id
      WHERE m.date BETWEEN ${startDate}::date AND ${endDate}::date GROUP BY m.date
    ),
    google AS (
      SELECT g.date::date AS day, SUM(g.spend)::double precision AS google_spend, SUM(g.impressions)::bigint AS google_impressions
      FROM google_ads_data g JOIN org o ON g.account_id = o.google_account_id
      WHERE g.date BETWEEN ${startDate}::date AND ${endDate}::date GROUP BY g.date
    ),
    store AS (
      SELECT s.date::date AS day, SUM(s.revenue)::double precision AS revenue, SUM(s.orders)::bigint AS orders, SUM(s.fees)::double precision AS fees
      FROM store_data s JOIN org o ON s.store_id = o.store_id
      WHERE s.date BETWEEN ${startDate}::date AND ${endDate}::date GROUP BY s.date
    ),
    base AS (
      SELECT d.day::text AS date,
        COALESCE(m.meta_spend, 0)::double precision AS meta_spend,
        COALESCE(m.meta_impressions, 0)::bigint AS meta_impressions,
        COALESCE(g.google_spend, 0)::double precision AS google_spend,
        COALESCE(g.google_impressions, 0)::bigint AS google_impressions,
        COALESCE(s.revenue, 0)::double precision AS revenue,
        COALESCE(s.orders, 0)::bigint AS orders,
        COALESCE(s.fees, 0)::double precision AS fees
      FROM dates d JOIN org o ON TRUE
      LEFT JOIN meta m ON m.day = d.day
      LEFT JOIN google g ON g.day = d.day
      LEFT JOIN store s ON s.day = d.day
    ),
    combined AS (
      SELECT date, meta_spend, meta_impressions, google_spend, google_impressions, revenue, orders, fees FROM base
      UNION ALL
      SELECT 'totals'::text, SUM(meta_spend)::double precision, SUM(meta_impressions)::bigint, SUM(google_spend)::double precision, SUM(google_impressions)::bigint, SUM(revenue)::double precision, SUM(orders)::bigint, SUM(fees)::double precision FROM base
    )
    SELECT * FROM combined ORDER BY (date = 'totals') ASC, date ASC
  `;

  const result = await db.execute(query);
  const rows = result.map(parseRawRow);

  if (rows.length === 0) return null;

  const totalsRow = rows.find((row) => row.date === "totals");
  if (!totalsRow) return null;

  const dailyRows = rows.filter((row) => row.date !== "totals");

  return {
    totals: computeMetrics(totalsRow, metrics),
    daily: dailyRows.map((row) => ({
      date: row.date,
      ...computeMetrics(row, metrics),
    })) as ReportData["daily"],
  };
}
