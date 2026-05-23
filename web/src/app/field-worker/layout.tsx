"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import Link from "next/link";
import Image from "next/image";
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  ClipboardList,
  Map,
  Bell,
  User,
} from "lucide-react";
import { useUnreadCount } from "@/hooks/useNotifications";
import { FieldWorkerLayoutSkeleton } from "@/components/skeletons/page-skeletons";

const navLinks = [
  { href: "/field-worker", label: "Dashboard", icon: LayoutDashboard },
  { href: "/field-worker/tasks", label: "My Tasks", icon: ClipboardList },
  { href: "/field-worker/map", label: "Waste Map", icon: Map },
  { href: "/field-worker/notifications", label: "Notifications", icon: Bell },
];

export default function FieldWorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { data: unreadData } = useUnreadCount();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
    if (!isLoading && user && user.role !== "FIELD_WORKER") {
      if (user.role === "LGU_ADMIN") {
        router.push("/dashboard");
      } else {
        router.push("/citizen/report");
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <FieldWorkerLayoutSkeleton />;
  }

  if (!user || user.role !== "FIELD_WORKER") return null;

  const isActive = (href: string) => {
    if (href === "/field-worker") return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link href="/field-worker" className="flex items-center gap-3">
            <Image
              src="/logo-bluewaste.png"
              alt="BlueWaste logo"
              width={44}
              height={44}
              quality={100}
              sizes="44px"
              className="h-11 w-11 rounded-lg object-contain"
            />
            <span className="hidden sm:inline text-xl font-bold">
              <span className="text-primary">Blue</span>
              <span className="text-gray-900">Waste</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                  {link.href === "/field-worker/notifications" &&
                    unreadData &&
                    unreadData.count > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadData.count > 9 ? "9+" : unreadData.count}
                      </span>
                    )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop User Info */}
          <div className="hidden md:flex items-center gap-3 relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors focus:outline-none"
            >
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.firstName}
                  width={40}
                  height={40}
                  className="rounded-full object-cover w-full h-full"
                />
              ) : (
                <User className="w-5 h-5" />
              )}
            </button>

            {profileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileMenuOpen(false)}
                />
                <div className="absolute right-0 top-12 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-50">
                  <div className="px-4 py-2 border-b mb-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      logout();
                      router.push("/");
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile: Menu button */}
          <div className="md:hidden flex items-center gap-2">
            <span className="text-xs text-gray-600">{user.firstName}</span>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              title="Toggle menu"
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-gray-600" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600" />
              )}
              {!mobileMenuOpen && unreadData && unreadData.count > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <nav className="mx-auto max-w-5xl px-4 py-3 space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive(link.href)
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                    {link.href === "/field-worker/notifications" &&
                      unreadData &&
                      unreadData.count > 0 && (
                        <span className="ml-auto w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {unreadData.count}
                        </span>
                      )}
                  </Link>
                );
              })}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                  router.push("/");
                }}
                className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
