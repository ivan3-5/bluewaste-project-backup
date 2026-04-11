import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { ResortBox } from "@/types";

interface CreateResortBoxPayload {
  name: string;
  description?: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  ownerId: string;
}

export function useResortBoxes(includeInactive = false, enabled = true) {
  return useQuery<ResortBox[]>({
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

export function useCreateResortBox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateResortBoxPayload) => {
      const { data } = await api.post("/resort-boxes", payload);
      return data as ResortBox;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resort-boxes"] });
      queryClient.invalidateQueries({ queryKey: ["map-data"] });
    },
  });
}

export function useDeactivateResortBox() {
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
