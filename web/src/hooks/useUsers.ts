import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { PaginatedResponse } from "@/types";

export interface UserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "CITIZEN" | "LGU_ADMIN" | "FIELD_WORKER";
  phone?: string;
  isActive: boolean;
  createdAt: string;
  _count?: { reports: number; assignedReports: number };
}

export interface UsersFilters {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
}

export function useUsers(filters: UsersFilters = {}) {
  const { page = 1, limit = 15, role, search } = filters;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (role) params.set("role", role);
  if (search) params.set("search", search);

  return useQuery<PaginatedResponse<UserRecord>>({
    queryKey: ["users", { page, limit, role, search }],
    queryFn: async () => {
      const { data } = await api.get(`/users?${params.toString()}`);
      return data;
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: string;
      phone?: string;
    }) => {
      const { data } = await api.post("/users", payload);
      return data as UserRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      role?: string;
      phone?: string;
      isActive?: boolean;
    }) => {
      const { data } = await api.put(`/users/${id}`, payload);
      return data as UserRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}