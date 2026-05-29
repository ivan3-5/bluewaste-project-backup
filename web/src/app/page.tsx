"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  BarChart3,
  Shield,
  Users,
  ArrowRight,
  CheckCircle2,
  Leaf,
  Zap,
  Navigation,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  Recycle,
} from "lucide-react";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const steps = [
  {
    step: "01",
    title: "Pin the Problem",
    description:
      "Citizens report waste issues directly on an interactive map with photos, location, and category.",
    icon: MapPin,
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    step: "02",
    title: "LGU Assigns a Team",
    description:
      "The LGU admin reviews the report and dispatches field workers to the location.",
    icon: Users,
    gradient: "from-violet-500 to-purple-400",
  },
  {
    step: "03",
    title: "Cleanup in Action",
    description:
      "Field workers arrive, collect the waste, and submit photo proof of the completed cleanup.",
    icon: Zap,
    gradient: "from-amber-500 to-orange-400",
  },
  {
    step: "04",
    title: "Resolved & Tracked",
    description:
      "The report is closed, analytics are updated, and the citizen gets notified instantly.",
    icon: CheckCircle2,
    gradient: "from-emerald-500 to-green-400",
  },
];

const features = [
  {
    icon: MapPin,
    title: "Interactive Map Reporting",
    description:
      "Pin exact waste locations on a live map. Attach photos and choose from predefined waste categories for faster triage.",
  },
  {
    icon: Users,
    title: "LGU Workforce Dispatch",
    description:
      "Admin assign field workers instantly. Real-time status updates keep everyone in the loop.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Visualize waste hotspots, and generate reports, date, or category.",
  },
  {
    icon: Shield,
    title: "Photo-Verified Closure",
    description:
      "Every cleanup is closed with photo evidence — ensuring accountability from report to resolution.",
  },
  {
    icon: Navigation,
    title: "Accurate GPS Tagging",
    description:
      "Pinpoint exact waste locations utilizing highly accurate GPS tagging for rapid LGU response and navigation.",
  },
  {
    icon: Leaf,
    title: "Environmental Impact",
    description:
      "Track your community's contribution — every resolved report is a measurable step toward a cleaner city.",
  },
];

const trustBadges = [
  { text: "Free for all residents", icon: Sparkles },
  { text: "Real-time updates", icon: Zap },
  { text: "Verified cleanups", icon: Shield },
];

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ── Navbar ── */}
      <header className="bg-white/90 backdrop-blur-lg border-b border-gray-100/80 sticky top-0 z-50 shadow-sm shadow-gray-200/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <Image
                src="/logo-bluewaste.png"
                alt="BlueWaste logo"
                width={44}
                height={44}
                quality={100}
                sizes="44px"
                className="h-11 w-11 object-contain transition-transform duration-300 group-hover:scale-105"
                unoptimized
                priority
              />
              <span className="text-xl font-bold tracking-tight">
                <span className="text-primary">Blue</span>
                <span className="text-gray-900">Waste</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center text-sm font-medium text-gray-600">
              <a
                href="#how-it-works"
                className="px-4 py-2 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
              >
                How It Works
              </a>
              <a
                href="#features"
                className="px-4 py-2 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
              >
                Features
              </a>
            </nav>

            <div className="hidden md:flex items-center space-x-3">
              <Link href="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 h-9"
                >
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="sm"
                  className="h-9 shadow-sm shadow-primary/15 hover:shadow-md hover:shadow-primary/20 transition-shadow duration-200"
                >
                  Get Started
                </Button>
              </Link>
            </div>

            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>

          <div
            id="mobile-nav"
            hidden={!mobileMenuOpen}
            className={`md:hidden overflow-hidden transition-all duration-300 ease-out ${
              mobileMenuOpen
                ? "max-h-80 opacity-100 pb-5"
                : "max-h-0 opacity-0 pb-0"
            }`}
          >
            <nav className="pt-3 flex flex-col gap-1 text-sm font-medium text-gray-700">
              <a
                href="#how-it-works"
                className="px-4 py-2.5 rounded-lg hover:bg-gray-50 hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </a>
              <a
                href="#features"
                className="px-4 py-2.5 rounded-lg hover:bg-gray-50 hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
            </nav>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Login
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button size="sm" className="w-full">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className={`relative overflow-hidden ${plusJakarta.className}`}>
        <div className="absolute inset-0 bg-white" />
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.22)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="absolute bottom-0 right-10 h-72 w-72 rounded-full bg-gradient-to-tr from-cyan-100/30 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 h-80 w-80 rounded-full bg-gradient-to-tr from-emerald-100/25 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-10 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/80 px-4 py-1.5 text-xs font-semibold text-blue-700 shadow-sm backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                Now serving the coastal communities of Panabo City
              </div>

              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-[3.6rem] font-extrabold text-slate-900 leading-[1.05] tracking-tight">
                Smart Waste Management
                <span className="block text-primary">for Panabo City</span>
              </h1>

              <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Report waste problems, track cleanup progress, and help keep our
                city clean. BlueWaste connects citizens with local government
                for faster environmental action.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="h-12 px-8 text-base font-semibold gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    Report Waste Now
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/map">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 px-8 text-base font-semibold border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <Navigation className="w-4 h-4" />
                    View Map
                  </Button>
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap justify-center lg:justify-start gap-x-8 gap-y-2">
                {trustBadges.map(({ text, icon: Icon }) => (
                  <span
                    key={text}
                    className="flex items-center gap-2 text-sm text-slate-500"
                  >
                    <Icon className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    {text}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative flex items-center justify-center lg:-mr-6">
              <Image
                src="/hero-right-image.png"
                alt="BlueWaste System Dashboard Preview"
                width={1100}
                height={825}
                className="w-full h-auto object-contain lg:scale-[1.12] xl:scale-[1.18]"
                priority
                unoptimized
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-20 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold text-primary uppercase tracking-[0.2em] bg-primary/5 px-4 py-1.5 rounded-full">
              Process
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-gray-900">
              How BlueWaste Works
            </h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto text-base">
              From citizen report to verified cleanup — four simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {steps.map(
              ({ step, title, description, icon: Icon, gradient }, i) => (
                <div key={step} className="relative group">
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-10 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-0.5 bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100 z-0" />
                  )}
                  <div className="relative z-10 flex flex-col items-center text-center px-4 py-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300">
                    <div
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-5 shadow-lg transition-transform duration-300 group-hover:scale-110`}
                    >
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-xs font-bold text-gray-300 mb-2 tracking-widest">
                      STEP {step}
                    </span>
                    <h3 className="text-base font-bold text-gray-900 mb-2">
                      {title}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section
        id="features"
        className="py-20 sm:py-24 bg-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-50 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-sky-50 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold text-primary uppercase tracking-[0.2em] bg-primary/5 px-4 py-1.5 rounded-full">
              Features
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-gray-900">
              Everything you need in one platform
            </h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto text-base">
              Built for citizens, field workers, and city administrators alike.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group relative rounded-xl bg-white border border-gray-100 shadow-md p-6 hover:shadow-xl hover:border-gray-200 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                  {title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-20 sm:py-24 relative overflow-hidden bg-gray-50">
        <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(59,130,246,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.5)_1px,transparent_1px)] [background-size:48px_48px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/5 border border-primary/10 text-primary text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6">
            <Recycle className="w-3.5 h-3.5" />
            Join the movement
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
            Ready to make Panabo City cleaner?
          </h2>
          <p className="mt-4 text-gray-500 text-base max-w-xl mx-auto leading-relaxed">
            Be part of the solution. Join residents already reporting waste and
            tracking cleanups across the city — completely free.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register">
              <Button
                size="lg"
                className="h-12 px-8 text-base font-semibold gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
              >
                Get Started Free
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base font-semibold border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-white pt-14 pb-8 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-10">
            <div className="md:col-span-5 lg:col-span-5">
              <div className="flex items-center space-x-2.5 mb-4">
                <Image
                  src="/logo-bluewaste.png"
                  alt="BlueWaste logo"
                  width={36}
                  height={36}
                  quality={100}
                  sizes="36px"
                  className="h-9 w-9 object-contain"
                  unoptimized
                />
                <span className="text-xl font-bold text-gray-900">
                  <span className="text-primary">Blue</span>
                  <span className="text-gray-900">Waste</span>
                </span>
              </div>
              <p className="text-sm text-gray-500 max-w-sm leading-relaxed mb-6">
                Empowering the citizens of Panabo City to proactively report
                waste issues, ensuring a cleaner, greener, and healthier coastal
                environment for everyone.
              </p>
            </div>

            <div className="md:col-span-3 lg:col-span-3 md:col-start-7">
              <h4 className="font-semibold text-gray-900 mb-4 text-sm tracking-tight">
                Platform
              </h4>
              <ul className="space-y-3 text-sm text-gray-500">
                <li>
                  <Link
                    href="/register"
                    className="hover:text-primary transition-colors"
                  >
                    Report Waste
                  </Link>
                </li>
                <li>
                  <Link
                    href="/map"
                    className="hover:text-primary transition-colors"
                  >
                    Interactive Map
                  </Link>
                </li>
                <li>
                  <a
                    href="#how-it-works"
                    className="hover:text-primary transition-colors"
                  >
                    How It Works
                  </a>
                </li>
              </ul>
            </div>

            <div className="md:col-span-3 lg:col-span-3">
              <h4 className="font-semibold text-gray-900 mb-4 text-sm tracking-tight">
                Account & Legal
              </h4>
              <ul className="space-y-3 text-sm text-gray-500">
                <li>
                  <Link
                    href="/login"
                    className="hover:text-primary transition-colors"
                  >
                    Citizen Login
                  </Link>
                </li>
                <li>
                  <Link
                    href="/register"
                    className="hover:text-primary transition-colors"
                  >
                    Create Account
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} BlueWaste. Panabo City Smart
              Waste Management.
            </p>
            <p className="text-sm text-gray-500">
              Made with <span className="text-red-500">&hearts;</span> for a
              cleaner Panabo
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
