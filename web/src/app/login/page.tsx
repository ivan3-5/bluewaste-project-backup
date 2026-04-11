"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/providers/AuthProvider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  BarChart3,
  Shield,
} from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

const features = [
  { icon: MapPin, label: "Report waste on an interactive map" },
  { icon: BarChart3, label: "Real-time cleanup analytics" },
  { icon: Shield, label: "Photo-verified resolution tracking" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoading(true);
      setError("");
      await login(data.email, data.password);
      const savedUser = localStorage.getItem("bluewaste_user");
      if (savedUser) {
        const user = JSON.parse(savedUser);
        if (user.role === "LGU_ADMIN" || user.role === "RESORT_ADMIN") {
          router.push("/dashboard");
        } else if (user.role === "FIELD_WORKER") {
          router.push("/field-worker");
        } else {
          router.push("/citizen/report");
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-gray-900">
      <div className="absolute inset-0 auth-eco-gradient" />
      <div className="absolute inset-0 auth-eco-noise opacity-35" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-sky-100 bg-white/90 shadow-[0_32px_80px_-36px_rgba(2,132,199,0.55)] backdrop-blur-md lg:min-h-[680px] lg:grid-cols-[1.05fr_1fr]">
          <section className="relative flex flex-col justify-between bg-gradient-to-br from-sky-50 via-cyan-50 to-white px-7 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(59,130,246,0.18),transparent_42%),radial-gradient(circle_at_85%_85%,rgba(14,165,233,0.16),transparent_48%)]" />
            <div className="pointer-events-none absolute inset-0 auth-panel-grid-soft" />

            <div className="relative space-y-8">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo-bluewaste.png"
                  alt="BlueWaste logo"
                  width={46}
                  height={46}
                  quality={100}
                  sizes="46px"
                  className="h-11 w-11 rounded-xl object-contain ring-1 ring-primary/20"
                  priority
                />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-blue-700/90">
                    BlueWaste System
                  </p>
                  <h1 className="text-xl font-semibold text-slate-900">
                    Panabo City
                  </h1>
                </div>
              </div>

              <div>
                <p className="mb-3 inline-flex items-center rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-medium text-blue-700 backdrop-blur-sm">
                  Eco Action Platform
                </p>
                <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
                  Smart Waste,
                  <br />
                  <span className="text-primary">Smarter City.</span>
                </h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600">
                  Empowering Panabo City residents to report and track waste,
                  keeping every barangay cleaner through community
                  participation.
                </p>
              </div>

              <ul
                className="space-y-3"
                aria-label="BlueWaste platform highlights"
              >
                {features.map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="flex items-center gap-3 rounded-xl border border-blue-100/80 bg-white/80 px-3 py-3 backdrop-blur-sm"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="relative mt-8 text-xs text-slate-600">
              © {new Date().getFullYear()} BlueWaste. Cleaner spaces, healthier
              communities.
            </p>
          </section>

          <section className="flex items-center bg-white px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-7 sm:mb-8">
                <h2 className="text-3xl font-bold text-slate-900">
                  Welcome back
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Sign in to continue your environmental reporting and cleanup
                  tracking.
                </p>
              </div>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5"
                noValidate
              >
                {error && (
                  <div
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                    role="alert"
                    aria-live="polite"
                  >
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-slate-700"
                  >
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={
                        errors.email ? "email-error" : undefined
                      }
                      className="h-11 rounded-xl border-slate-200 pl-10 focus-visible:border-primary focus-visible:ring-primary/30"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p id="email-error" className="text-xs text-red-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium text-slate-700"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={
                        errors.password ? "password-error" : undefined
                      }
                      className="h-11 rounded-xl border-slate-200 pl-10 pr-11 focus-visible:border-primary focus-visible:ring-primary/30"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-blue-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p id="password-error" className="text-xs text-red-600">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-primary font-medium text-white transition hover:bg-blue-700"
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing in...
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>

              <div className="mt-6 border-t border-slate-100 pt-6">
                <p className="text-center text-sm text-slate-600">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/register"
                    className="font-semibold text-primary underline-offset-2 transition hover:text-blue-700 hover:underline"
                  >
                    Create one free
                  </Link>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
