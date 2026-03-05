import { type NextRequest } from "next/server";
import { AVAILABLE_METRICS, getReportData, validateMetrics } from "@/lib/reporting";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(dateString: string): boolean {
  if (!DATE_REGEX.test(dateString)) return false;
  const parsed = new Date(`${dateString}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === dateString;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orgIdParam = searchParams.get("orgId");
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const metricsParam = searchParams.get("metrics");

  const missingParams = [orgIdParam, startDateParam, endDateParam, metricsParam]
    .map((value, index) => (!value?.trim() ? ["orgId", "startDate", "endDate", "metrics"][index] : null))
    .filter(Boolean);

  if (missingParams.length > 0) {
    return Response.json(
      { error: `Missing required parameters: ${missingParams.join(", ")}` },
      { status: 400 },
    );
  }

  const orgId = Number(orgIdParam);
  if (!Number.isInteger(orgId) || orgId <= 0) {
    return Response.json({ error: "orgId must be a positive integer" }, { status: 400 });
  }

  const startDate = startDateParam!;
  const endDate = endDateParam!;
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return Response.json(
      { error: "startDate and endDate must be valid YYYY-MM-DD dates" },
      { status: 400 },
    );
  }
  if (startDate > endDate) {
    return Response.json(
      { error: "startDate must be less than or equal to endDate" },
      { status: 400 },
    );
  }

  const requestedMetrics = Array.from(
    new Set(metricsParam!.split(",").map((metric) => metric.trim()).filter(Boolean)),
  );
  if (requestedMetrics.length === 0) {
    return Response.json(
      { error: "metrics must include at least one metric" },
      { status: 400 },
    );
  }

  const { valid: validMetrics, invalid: invalidMetrics } = validateMetrics(requestedMetrics);
  if (invalidMetrics.length > 0) {
    return Response.json(
      { error: `Unsupported metrics: ${invalidMetrics.join(", ")}`, availableMetrics: AVAILABLE_METRICS },
      { status: 400 },
    );
  }

  try {
    const data = await getReportData({ orgId, startDate, endDate, metrics: validMetrics });
    if (!data) {
      return Response.json(
        { error: `Organization with id ${orgId} does not exist` },
        { status: 404 },
      );
    }
    return Response.json(data);
  } catch (error) {
    console.error("Error generating reporting data", error);
    return Response.json(
      { error: "Internal error generating the report" },
      { status: 500 },
    );
  }
}
