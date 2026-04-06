"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useUnreadCount } from "@/hooks/useNotifications";
import { Bell, Menu, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function Header() {
  const { user, logout, isAdmin } = useAuth();
  const { data: unreadData } = useUnreadCount();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const notifPath = isAdmin
    ? "/dashboard/notifications"
    : "/citizen/my-reports";

  return (
    <header className="sticky top-0 z-40 bg-white border-b">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Mobile menu toggle */}
        <button
          title="Toggle mobile menu"
          className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="md:hidden flex items-center space-x-2">
          <Image
            src="/logo-bluewaste.png"
            alt="BlueWaste logo"
            width={36}
            height={36}
            quality={100}
            sizes="36px"
            className="h-9 w-9 rounded-md object-contain"
          />
          <span className="font-bold text-primary">BlueWaste</span>
        </div>

        <div className="hidden md:block">
          <h2 className="text-lg font-semibold text-gray-800">
            {isAdmin ? "Admin Dashboard" : "Citizen Portal"}
          </h2>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          <Link
            href={notifPath}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {unreadData && unreadData.count > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadData.count > 9 ? "9+" : unreadData.count}
              </span>
            )}
          </Link>

          <div className="hidden md:flex items-center space-x-2 relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-xs font-semibold text-primary">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-700">
                {user?.firstName}
              </span>
            </button>

            {/* Profile Dropdown */}
            {profileMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50">
                <div className="px-4 py-3 border-b">
                  <p className="text-sm font-semibold text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {isAdmin ? "Administrator" : "Citizen"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    logout();
                    router.push("/");
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-white py-2 px-4 space-y-1">
          {isAdmin ? (
            <>
              <MobileLink
                href="/dashboard"
                label="Dashboard"
                onClick={() => setMobileMenuOpen(false)}
              />
              <MobileLink
                href="/dashboard/reports"
                label="Reports"
                onClick={() => setMobileMenuOpen(false)}
              />
              <MobileLink
                href="/dashboard/map"
                label="Waste Map"
                onClick={() => setMobileMenuOpen(false)}
              />
              <MobileLink
                href="/dashboard/analytics"
                label="Analytics"
                onClick={() => setMobileMenuOpen(false)}
              />
              <MobileLink
                href="/dashboard/barangays"
                label="Barangays"
                onClick={() => setMobileMenuOpen(false)}
              />
              <MobileLink
                href="/dashboard/notifications"
                label="Notifications"
                onClick={() => setMobileMenuOpen(false)}
              />
            </>
          ) : (
            <>
              <MobileLink
                href="/citizen/report"
                label="Submit Report"
                onClick={() => setMobileMenuOpen(false)}
              />
              <MobileLink
                href="/citizen/my-reports"
                label="My Reports"
                onClick={() => setMobileMenuOpen(false)}
              />
              <MobileLink
                href="/citizen/map"
                label="Waste Map"
                onClick={() => setMobileMenuOpen(false)}
              />
            </>
          )}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              logout();
              router.push("/");
            }}
            className="flex items-center w-full px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </button>
        </div>
      )}
    </header>
  );
}

function MobileLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100"
    >
      {label}
    </Link>
  );
}
