export interface MtaLabels {
  title: string;
  description: string;
  locationLabel: string;
  locationPlaceholder: string;
  useLocation: string;
  locating: string;
  search: string;
  nearbyStops: string;
  updated: string;
  refreshes: string;
  refresh: string;
  direction: string;
  minutes: string;
  now: string;
  walk: string;
  locationError: string;
  searchHint: string;
  searchError: string;
  arrivalError: string;
  noArrivals: string;
  filterByTrain: string;
  allTrains: string;
  previousTrains: string;
  nextTrains: string;
  currentLocation: string;
  northbound: string;
  southbound: string;
  service: string;
  attribution: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface InitialMtaState {
  coordinates: Coordinates;
  locationName: string;
  selectedRoute: string | null;
}

export interface LocationSuggestion extends Coordinates {
  label: string;
}

export interface LiveStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  routes: string[];
  distance: number;
  arrivals: Array<{
    route: string;
    direction: string;
    destination: string;
    minutes: number;
    arrivalAt: string;
  }>;
}
