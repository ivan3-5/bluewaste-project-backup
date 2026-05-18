import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { ReportingZone, ZonePoint } from "@/types";

export function useReportingZones(activeOnly = true) {
  return useQuery<ReportingZone[]>({
    queryKey: ["reporting-zones", activeOnly],
    queryFn: async () => {
      const url = activeOnly ? "/reporting-zones" : "/reporting-zones?all=true";
      const { data } = await api.get(url);
      return data;
    },
    staleTime: 60000,
  });
}

export function useCreateReportingZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; coordinates: ZonePoint[] }) => {
      const { data } = await api.post("/reporting-zones", payload);
      return data as ReportingZone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reporting-zones"] });
    },
  });
}

export function useUpdateReportingZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      name?: string;
      coordinates?: ZonePoint[];
      isActive?: boolean;
    }) => {
      const { id, ...body } = payload;
      const { data } = await api.put(`/reporting-zones/${id}`, body);
      return data as ReportingZone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reporting-zones"] });
    },
  });
}

export function useDeleteReportingZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/reporting-zones/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reporting-zones"] });
    },
  });
}

/** Ray-casting point-in-polygon check */
export function isPointInZone(
  lat: number,
  lng: number,
  zone: ReportingZone,
): boolean {
  const polygon = zone.coordinates;
  const n = polygon.length;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].lng,
      yi = polygon[i].lat;
    const xj = polygon[j].lng,
      yj = polygon[j].lat;
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isPointInAnyZone(
  lat: number,
  lng: number,
  zones: ReportingZone[],
): boolean {
  return zones.some((z) => z.isActive && isPointInZone(lat, lng, z));
}
