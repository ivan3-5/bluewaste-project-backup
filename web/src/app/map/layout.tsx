"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";

function UserProfileMenu({
  user,
  router,
  logout,
}: {
  user: any;
  router: any;
  logout: any;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors focus:outline-none"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={`${user.firstName} ${user.lastName}`}
            className="rounded-full w-9 h-9 object-cover"
          />
        ) : (
          <User className="w-5 h-5" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-50">
            <div className="px-4 py-2 border-b mb-2">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                // simple logout flow: navigate to profile destination or root
                router.push(
                  user.role === "FIELD_WORKER"
                    ? "/field-worker"
                    : "/citizen/report",
                );
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
            >
              <svg className="w-4 h-4 text-gray-500" />
              Open Profile
            </button>
            <button
              onClick={() => {
                setOpen(false);
                logout?.();
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
  );
}

export default function PublicMapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <header className="border-b bg-white shadow-sm sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/logo-bluewaste.png"
              alt="BlueWaste logo"
              width={44}
              height={44}
              quality={100}
              sizes="44px"
              className="h-11 w-11 rounded-lg object-contain"
            />
            <span className="text-xl font-bold">
              <span className="text-primary">Blue</span>
              <span className="text-gray-900">Waste</span>
            </span>
          </Link>

          <h1 className="flex-1 text-center text-lg font-semibold text-gray-800">
            Waste Reports Map
          </h1>

          <div className="flex items-center gap-2 relative">
            {user ? (
              <UserProfileMenu user={user} router={router} logout={logout} />
            ) : (
              <>
                <Link href="/login">
                  <Button size="sm" variant="outline">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
