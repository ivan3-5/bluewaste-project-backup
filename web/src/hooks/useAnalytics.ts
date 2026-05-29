import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { BarangayStats } from "@/types";

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
