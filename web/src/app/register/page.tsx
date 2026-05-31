"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/providers/AuthProvider";
import { getApiErrorMessage } from "@/lib/apiError";
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
  Phone,
  User,
  MapPin,
  BarChart3,
  CheckCircle2,
} from "lucide-react";

const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    phone: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

const features = [
  { icon: CheckCircle2, label: "Free account for all residents" },
  { icon: MapPin, label: "Report waste from anywhere, anytime" },
  { icon: BarChart3, label: "Track your environmental impact" },
];

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setLoading(true);
      setError("");
      await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      });
      router.push("/citizen/report");
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-gray-900">
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_32px_80px_-36px_rgba(2,132,199,0.55)] lg:min-h-[760px] lg:grid-cols-[1.02fr_1fr]">
          <section className="relative flex flex-col justify-between bg-white px-7 py-8 sm:px-10 sm:py-10 lg:border-r lg:border-slate-200 lg:px-12 lg:py-12">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:34px_34px]" />
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
                  Community Registration
                </p>
                <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
                  Join the
                  <br />
                  <span className="text-primary">Clean City Mission.</span>
                </h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600">
                  Create your account and help transform waste reports into real
                  cleanup action for your neighborhood.
                </p>
              </div>

              <ul
                className="space-y-3"
                aria-label="Benefits of creating a BlueWaste account"
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
              © {new Date().getFullYear()} BlueWaste. Building cleaner
              communities together.
            </p>
          </section>

          <section className="flex items-center bg-white px-6 py-8 sm:px-10 sm:py-10 lg:border-l lg:border-slate-200 lg:px-12 lg:py-12">
            <div className="mx-auto w-full max-w-lg">
              <div className="mb-6 sm:mb-7">
                <h2 className="text-3xl font-bold text-slate-900">
                  Create your account
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Join BlueWaste to report, monitor, and support cleaner public
                  spaces.
                </p>
              </div>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="firstName"
                      className="text-sm font-medium text-slate-700"
                    >
                      First name
                    </Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="firstName"
                        autoComplete="given-name"
                        placeholder="Juan"
                        aria-invalid={Boolean(errors.firstName)}
                        aria-describedby={
                          errors.firstName ? "firstName-error" : undefined
                        }
                        className="h-11 rounded-xl border-slate-200 pl-10 focus-visible:border-primary focus-visible:ring-primary/30"
                        {...register("firstName")}
                      />
                    </div>
                    {errors.firstName && (
                      <p id="firstName-error" className="text-xs text-red-600">
                        {errors.firstName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="lastName"
                      className="text-sm font-medium text-slate-700"
                    >
                      Last name
                    </Label>
                    <Input
                      id="lastName"
                      autoComplete="family-name"
                      placeholder="Dela Cruz"
                      aria-invalid={Boolean(errors.lastName)}
                      aria-describedby={
                        errors.lastName ? "lastName-error" : undefined
                      }
                      className="h-11 rounded-xl border-slate-200 focus-visible:border-primary focus-visible:ring-primary/30"
                      {...register("lastName")}
                    />
                    {errors.lastName && (
                      <p id="lastName-error" className="text-xs text-red-600">
                        {errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

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
                    htmlFor="phone"
                    className="text-sm font-medium text-slate-700"
                  >
                    Phone{" "}
                    <span className="font-normal text-slate-400">
                      (optional)
                    </span>
                  </Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+639xxxxxxxxx"
                      className="h-11 rounded-xl border-slate-200 pl-10 focus-visible:border-primary focus-visible:ring-primary/30"
                      {...register("phone")}
                    />
                  </div>
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
                      autoComplete="new-password"
                      placeholder="Minimum 6 characters"
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={
                        errors.password ? "password-error" : "password-help"
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
                  <p id="password-help" className="text-xs text-slate-500">
                    Use at least 6 characters for account security.
                  </p>
                  {errors.password && (
                    <p id="password-error" className="text-xs text-red-600">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium text-slate-700"
                  >
                    Confirm password
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      aria-invalid={Boolean(errors.confirmPassword)}
                      aria-describedby={
                        errors.confirmPassword
                          ? "confirmPassword-error"
                          : undefined
                      }
                      className="h-11 rounded-xl border-slate-200 pl-10 pr-11 focus-visible:border-primary focus-visible:ring-primary/30"
                      {...register("confirmPassword")}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-blue-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p
                      id="confirmPassword-error"
                      className="text-xs text-red-600"
                    >
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="mt-1 h-11 w-full rounded-xl bg-primary font-medium text-white transition hover:bg-blue-700"
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Creating account...
                    </span>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>

              <div className="mt-6 border-t border-slate-100 pt-6">
                <p className="text-center text-sm text-slate-600">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-primary underline-offset-2 transition hover:text-blue-700 hover:underline"
                  >
                    Sign in
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
