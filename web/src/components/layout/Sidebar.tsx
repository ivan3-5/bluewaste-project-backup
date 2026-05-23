"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useSidebar } from "@/contexts/SidebarContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Map,
  BarChart3,
  Building2,
  Bell,
  PlusCircle,
  ClipboardList,
  LogOut,
  Menu,
  Users,
  ArchiveX,
} from "lucide-react";

const adminLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/map", label: "Waste Map", icon: Map },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/barangays", label: "Barangays", icon: Building2 },
  { href: "/dashboard/users", label: "User Management", icon: Users },
  { href: "/dashboard/spam", label: "Spam", icon: ArchiveX },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
];

const resortAdminLinks = [
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/map", label: "Waste Map", icon: Map },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
];

const citizenLinks = [
  { href: "/citizen/report", label: "Submit Report", icon: PlusCircle },
  { href: "/citizen/my-reports", label: "My Reports", icon: ClipboardList },
  { href: "/citizen/map", label: "Waste Map", icon: Map },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAdmin } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebar();

  const links = isAdmin
    ? user?.role === "RESORT_ADMIN"
      ? resortAdminLinks
      : adminLinks
    : citizenLinks;

  return (
    <aside
      className={cn(
        "hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 border-r border-white/70 bg-white/65 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:30px_30px] shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all duration-300 ease-in-out z-40",
        isCollapsed ? "md:w-20" : "md:w-64",
      )}
    >
      {/* Logo & Toggle */}
      <div
        className={cn(
          "flex items-center border-b border-white/70",
          isCollapsed
            ? "h-24 justify-center px-2 flex-col gap-2"
            : "h-16 justify-between px-4",
        )}
      >
        {!isCollapsed && (
          <Link
            href={isAdmin ? "/dashboard" : "/citizen/report"}
            className="flex items-center space-x-2"
          >
            <Image
              src="/logo-bluewaste.png"
              alt="BlueWaste logo"
              width={36}
              height={36}
              quality={100}
              sizes="36px"
              className="h-9 w-9 rounded-lg object-contain"
            />
            <span className="text-xl font-bold">
              <span className="text-primary">Blue</span>
              <span className="text-black">Waste</span>
            </span>
          </Link>
        )}

        {isCollapsed && (
          <Link
            href={isAdmin ? "/dashboard" : "/citizen/report"}
            className="flex h-9 w-9 items-center justify-center rounded-lg"
          >
            <Image
              src="/logo-bluewaste.png"
              alt="BlueWaste logo"
              width={36}
              height={36}
              quality={100}
              sizes="36px"
              className="h-9 w-9 object-contain"
            />
          </Link>
        )}

        <button
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
          className="p-1.5 rounded-lg text-gray-600 transition-colors hover:bg-gray-100/80"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                isActive
                  ? "border border-white/60 bg-primary text-white shadow-[0_6px_18px_rgba(37,99,235,0.35)] backdrop-blur-md"
                  : "text-gray-700 hover:bg-white/50 hover:text-gray-900",
                isCollapsed && "justify-center",
              )}
              title={isCollapsed ? link.label : undefined}
            >
              <Icon className={cn("w-5 h-5", !isCollapsed && "mr-3")} />
              <span
                className={cn(
                  "transition-all duration-300 whitespace-nowrap",
                  isCollapsed && "opacity-0 w-0 overflow-hidden",
                )}
              >
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-white/70">
        <div
          className={cn(
            "flex items-center",
            isCollapsed ? "flex-col space-y-2" : "space-x-3",
          )}
        >
          <div
            className={cn(
              "rounded-full border border-white/80 bg-white/75 shadow-sm backdrop-blur-md flex items-center justify-center flex-shrink-0",
              isCollapsed ? "w-10 h-10" : "w-9 h-9",
            )}
          >
            <span className="text-sm font-semibold text-primary">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </span>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.role === "LGU_ADMIN"
                  ? "Administrator"
                  : user?.role === "RESORT_ADMIN"
                    ? "Resort Admin"
                    : user?.role === "FIELD_WORKER"
                      ? "Field Worker"
                      : "Citizen"}
              </p>
            </div>
          )}
          <button
            onClick={() => {
              logout();
              router.push("/");
            }}
            className={cn(
              "text-gray-400 transition-colors hover:text-red-500",
              isCollapsed && "mx-auto",
            )}
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
