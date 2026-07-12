import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { MtaLabels } from "./types";

import { StationGrid } from "./station-grid";

const labels = {
  direction: "Local service",
  minutes: "min",
  noArrivals: "No upcoming trains",
  northbound: "Northbound",
  now: "Now",
  service: "Service",
  southbound: "Southbound",
  walk: "walk",
} as MtaLabels;

describe("StationGrid", function () {
  it("renders one station tree regardless of responsive layout", function () {
    render(
      <StationGrid
        labels={labels}
        locale="en"
        stations={[
          {
            id: "101",
            name: "Test Station",
            latitude: 40.7,
            longitude: -74,
            routes: ["1"],
            distance: 0.2,
            arrivals: [],
          },
        ]}
      />,
    );

    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Test Station" })).toBeInTheDocument();
  });
});
