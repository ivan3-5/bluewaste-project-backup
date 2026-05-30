import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { BarangayStats, DashboardOverviewResponse } from "@/types";

type BackendBarangayStats = {
  id?: string;
  name?: string;
  totalReports?: number;
  count?: number;
  barangayId?: string;
  barangayName?: string;
};

function toNonNegativeInt(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.trunc(parsed);
    }
  }

  return 0;
}

export function useAnalyticsBarangays() {
  return useQuery<BarangayStats[]>({
    queryKey: ["analytics", "barangays"],
    queryFn: async () => {
      // Barangay analytics removed on backend; return empty list.
      return [];
    },
  });
}

export function useDashboardOverview(days = 30) {
  return useQuery<DashboardOverviewResponse>({
    queryKey: ["analytics", "dashboard", days],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (Number.isFinite(days)) {
        params.append("days", String(days));
      }
      const query = params.toString();
      const { data } = await api.get(
        `/analytics/dashboard${query ? `?${query}` : ""}`,
      );
      return data;
    },
    refetchInterval: 10000,
  });
}
