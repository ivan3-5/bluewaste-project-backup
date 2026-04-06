"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, LogOut } from "lucide-react";

const citizenLinks = [
  { href: "/citizen/report", label: "Submit Report", icon: "📝" },
  { href: "/report-waste", label: "AI Report", icon: "🤖" },
  { href: "/citizen/my-reports", label: "My Reports", icon: "📋" },
  { href: "/my-reports", label: "AI History", icon: "🧾" },
  { href: "/citizen/map", label: "Map View", icon: "🗺️" },
];

export default function CitizenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link href="/citizen/report" className="flex items-center gap-3">
            <Image
              src="/logo-bluewaste.png"
              alt="BlueWaste logo"
              width={44}
              height={44}
              quality={100}
              sizes="44px"
              className="h-11 w-11 rounded-lg object-contain"
            />
            <span className="hidden sm:inline text-xl font-bold text-primary">
              BlueWaste
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {citizenLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <span className="mr-1">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop User Info */}
          <div className="hidden md:flex items-center gap-3">
            <span className="text-sm text-gray-600">{user.firstName}</span>
            <button
              onClick={() => {
                logout();
                router.push("/");
              }}
              className="text-sm font-medium bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>

          {/* Mobile: User name + Menu button */}
          <div className="md:hidden flex items-center gap-2">
            <span className="text-xs text-gray-600">{user.firstName}</span>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              title="Toggle menu"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-gray-600" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <nav className="mx-auto max-w-5xl px-4 py-3 space-y-1">
              {citizenLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                  }`}
                >
                  <span>{link.icon}</span>
                  {link.label}
                </Link>
              ))}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                  router.push("/");
                }}
                className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
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
