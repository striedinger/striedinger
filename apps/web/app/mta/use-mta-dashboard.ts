"use client";

import { useReducer } from "react";

import type { Coordinates, InitialMtaState, LiveStation, LocationSuggestion } from "./types";

type RequestState = "idle" | "loading" | "error";
type ArrivalState = "loading" | "ready" | "error";

interface DashboardState {
  coordinates: Coordinates;
  locationName: string;
  query: string;
  locationState: RequestState;
  suggestions: readonly LocationSuggestion[];
  searchState: RequestState;
  updatedAt: Date;
  nearbyStations: LiveStation[];
  arrivalState: ArrivalState;
  refreshVersion: number;
  selectedRoute: string | null;
  loadedRoute: string | null;
}

type DashboardAction =
  | { type: "arrival-requested" }
  | { type: "arrival-loaded"; stations: LiveStation[]; updatedAt: string; route: string | null }
  | { type: "arrival-failed" }
  | { type: "location-detection-requested" }
  | { type: "location-detection-failed" }
  | { type: "location-detected"; coordinates: Coordinates; locationName: string }
  | { type: "location-selected"; suggestion: LocationSuggestion }
  | { type: "query-changed"; query: string }
  | { type: "refresh-requested" }
  | { type: "route-selected"; route: string | null }
  | { type: "search-requested" }
  | { type: "search-failed" }
  | { type: "suggestions-loaded"; suggestions: readonly LocationSuggestion[] };

interface DashboardInitialData {
  initialState: InitialMtaState;
  initialStations: LiveStation[];
  initialUpdatedAt: string;
}

export function useMtaDashboard(initialData: DashboardInitialData) {
  return useReducer(reduceDashboard, initialData, createInitialDashboardState);
}

function createInitialDashboardState({
  initialState,
  initialStations,
  initialUpdatedAt,
}: DashboardInitialData): DashboardState {
  return {
    coordinates: initialState.coordinates,
    locationName: initialState.locationName,
    query: "",
    locationState: "idle",
    suggestions: [],
    searchState: "idle",
    updatedAt: new Date(initialUpdatedAt),
    nearbyStations: initialStations,
    arrivalState: initialStations.length > 0 ? "ready" : "error",
    refreshVersion: 0,
    selectedRoute: initialState.selectedRoute,
    loadedRoute: initialState.selectedRoute,
  };
}

function reduceDashboard(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case "arrival-requested":
      return { ...state, arrivalState: "loading" };
    case "arrival-loaded":
      return {
        ...state,
        nearbyStations: action.stations,
        loadedRoute: action.route,
        updatedAt: new Date(action.updatedAt),
        arrivalState: "ready",
      };
    case "arrival-failed":
      return { ...state, arrivalState: "error" };
    case "location-detection-requested":
      return { ...state, locationState: "loading", searchState: "idle" };
    case "location-detection-failed":
      return { ...state, locationState: "error" };
    case "location-detected":
      return {
        ...state,
        coordinates: action.coordinates,
        locationName: action.locationName,
        query: "",
        suggestions: [],
        selectedRoute: null,
        loadedRoute: null,
        locationState: "idle",
        arrivalState: "loading",
        updatedAt: new Date(),
      };
    case "location-selected":
      return {
        ...state,
        coordinates: {
          latitude: action.suggestion.latitude,
          longitude: action.suggestion.longitude,
        },
        locationName: action.suggestion.label,
        query: action.suggestion.label,
        suggestions: [],
        searchState: "idle",
        locationState: "idle",
        selectedRoute: null,
        loadedRoute: null,
        arrivalState: "loading",
        updatedAt: new Date(),
      };
    case "query-changed":
      return { ...state, query: action.query, searchState: "idle", suggestions: [] };
    case "refresh-requested":
      return { ...state, refreshVersion: state.refreshVersion + 1, arrivalState: "loading" };
    case "route-selected":
      return { ...state, selectedRoute: action.route, arrivalState: "loading" };
    case "search-requested":
      return { ...state, searchState: "loading" };
    case "search-failed":
      return { ...state, searchState: "error" };
    case "suggestions-loaded":
      return { ...state, suggestions: action.suggestions };
  }
}
