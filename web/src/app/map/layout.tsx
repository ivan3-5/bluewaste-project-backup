"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";

export default function PublicMapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
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
            <span className="text-xl font-bold text-primary">BlueWaste</span>
          </Link>

          <h1 className="flex-1 text-center text-lg font-semibold text-gray-800">
            Waste Reports Map
          </h1>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="text-sm text-gray-600">{user.firstName}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    router.push(
                      user.role === "LGU_ADMIN"
                        ? "/dashboard"
                        : "/citizen/report",
                    )
                  }
                >
                  {user.role === "LGU_ADMIN"
                    ? "Admin Dashboard"
                    : "Submit Report"}
                </Button>
              </>
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
