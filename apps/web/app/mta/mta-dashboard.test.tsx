import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MtaLabels } from "./types";

import { MtaDashboard } from "./mta-dashboard";

const navigationMocks = vi.hoisted(function createNavigationMocks() {
  return {
    push: vi.fn<(href: string, options?: { scroll?: boolean }) => void>(),
    refresh: vi.fn<() => void>(),
  };
});

vi.mock("next/navigation", function mockNavigation() {
  return { useRouter: () => navigationMocks };
});

vi.mock("./train-filter", function mockTrainFilter() {
  return {
    TrainFilter: MockTrainFilter,
  };
});

function MockTrainFilter({ onSelectRoute }: { onSelectRoute: (route: string | null) => void }) {
  return (
    <button
      type="button"
      aria-label="Filter by train: A"
      onClick={function selectTrain() {
        onSelectRoute("A");
      }}
    >
      A
    </button>
  );
}

const labels: MtaLabels = {
  allTrains: "All trains",
  arrivalError: "Arrivals unavailable",
  attribution: "Data attribution",
  currentLocation: "Current location",
  description: "Nearby subway arrivals",
  direction: "Direction",
  filterByTrain: "Filter by train",
  locationError: "Location unavailable",
  locationLabel: "Location",
  locationPlaceholder: "Enter a neighborhood or address",
  locating: "Locating",
  minutes: "minutes",
  nearbyStops: "Nearby stops",
  nextTrains: "Next trains",
  noArrivals: "No arrivals",
  northbound: "Northbound",
  now: "Now",
  previousTrains: "Previous trains",
  refresh: "Refresh",
  refreshes: "Refreshes every minute",
  search: "Search",
  searchError: "Search unavailable",
  searchHint: "Search for a location",
  service: "Service",
  southbound: "Southbound",
  title: "MTA",
  updated: "Updated",
  useLocation: "Use my location",
  walk: "walk",
};

describe("MtaDashboard", function () {
  beforeEach(function resetNavigation() {
    navigationMocks.push.mockClear();
    navigationMocks.refresh.mockClear();
  });

  it("updates train filters without resetting the document scroll", function () {
    render(
      <MtaDashboard
        initialState={{
          coordinates: { latitude: 40.7128, longitude: -74.006 },
          locationName: "Lower Manhattan",
          selectedRoute: null,
        }}
        initialStations={[]}
        initialSearchFailed={false}
        initialUpdatedAt="2026-07-19T18:00:00.000Z"
        labels={labels}
        locale="en-US"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: `${labels.filterByTrain}: A` }));

    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/mta?latitude=40.712800&location=Lower+Manhattan&longitude=-74.006000&train=A",
      { scroll: false },
    );
  });
});
