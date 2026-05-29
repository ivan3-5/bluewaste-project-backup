"use client";

import { ReactNode, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import { cn } from "@/lib/utils";
import {
  AdminOverviewSkeleton,
  DashboardLayoutSkeleton,
} from "@/components/skeletons/page-skeletons";

function DashboardContent({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          isCollapsed ? "md:pl-20" : "md:pl-64",
        )}
      >
        <Header />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
    if (!isLoading && user && user.role !== "LGU_ADMIN") {
      if (user.role === "FIELD_WORKER") {
        router.push("/field-worker");
      } else {
        router.push("/citizen/report");
      }
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading) {
    const isAdminOverviewRoute = pathname === "/dashboard";

    return (
      <DashboardLayoutSkeleton>
        {isAdminOverviewRoute && <AdminOverviewSkeleton />}
      </DashboardLayoutSkeleton>
    );
  }

  if (!user || user.role !== "LGU_ADMIN") {
    return null;
  }

  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
