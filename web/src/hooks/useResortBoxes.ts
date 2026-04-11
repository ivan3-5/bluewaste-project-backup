import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { ResortArea } from "@/types";

interface CreateResortAreaPayload {
  name: string;
  description?: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  ownerId: string;
}

export function useResortAreaes(includeInactive = false, enabled = true) {
  return useQuery<ResortArea[]>({
    queryKey: ["resort-boxes", includeInactive],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (includeInactive) {
        params.set("includeInactive", "true");
      }

      const suffix = params.toString();
      const url = suffix ? `/resort-boxes?${suffix}` : "/resort-boxes";
      const { data } = await api.get(url);
      return data;
    },
    enabled,
    refetchInterval: 30000,
  });
}

export function useCreateResortArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateResortAreaPayload) => {
      const { data } = await api.post("/resort-boxes", payload);
      return data as ResortArea;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resort-boxes"] });
      queryClient.invalidateQueries({ queryKey: ["map-data"] });
    },
  });
}

export function useDeactivateResortArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/resort-boxes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resort-boxes"] });
      queryClient.invalidateQueries({ queryKey: ["map-data"] });
    },
  });
}
