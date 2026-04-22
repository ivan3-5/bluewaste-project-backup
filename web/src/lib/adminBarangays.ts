import { BarangayStats } from "@/types";

export const ADMIN_ALLOWED_BARANGAY_NAMES = [
  "San Pedro",
  "Cagangohan",
  "San Vicente",
] as const;

const adminAllowedBarangayNameSet = new Set(
  ADMIN_ALLOWED_BARANGAY_NAMES.map((name) => name.toLowerCase()),
);

export function isAdminAllowedBarangayName(name?: string | null) {
  if (!name) return false;
  return adminAllowedBarangayNameSet.has(name.trim().toLowerCase());
}

export function filterAdminBarangaysByName<T extends { name: string }>(
  barangays: T[],
) {
  return barangays.filter((barangay) =>
    isAdminAllowedBarangayName(barangay.name),
  );
}

export function filterAdminBarangayStats<T extends BarangayStats>(stats: T[]) {
  return stats.filter((stat) => isAdminAllowedBarangayName(stat.barangayName));
}
