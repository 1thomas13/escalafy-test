import { render, screen } from "@testing-library/react";
import { ReportFilters } from "@/components/report-filters";

test("renders without crashing", () => {
  render(
    <ReportFilters
      value={{
        orgId: "1",
        startDate: "2026-01-27",
        endDate: "2026-02-26",
        metrics: ["revenue", "profit"],
      }}
      onChange={() => {}}
    />,
  );
  expect(screen.getByText("Organization")).toBeInTheDocument();
});
