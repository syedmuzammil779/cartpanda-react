import type { FunnelState } from "../types";
import { STORAGE_KEY } from "../types";

export function loadFunnel(): FunnelState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FunnelState;
    if (Array.isArray(parsed?.nodes) && Array.isArray(parsed?.edges)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveFunnel(state: FunnelState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function exportFunnelJSON(state: FunnelState): string {
  return JSON.stringify(state, null, 2);
}

export function importFunnelJSON(json: string): FunnelState | null {
  try {
    const parsed = JSON.parse(json) as FunnelState;
    if (Array.isArray(parsed?.nodes) && Array.isArray(parsed?.edges)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
