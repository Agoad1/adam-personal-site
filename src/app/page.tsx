import Link from "next/link";
import { Suspense } from "react";
import DoorDashWidget from "@/components/DoorDashWidget";
import WorkoutWidget from "@/components/WorkoutWidget";
import CurrentlyBuilding from "@/components/CurrentlyBuilding";
import ChatAgent from "@/components/ChatAgent";

function WidgetSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-4 w-32 bg-[rgba(59,130,246,0.1)] rounded mb-4" />
      <div className="h-8 w-20 bg-[rgba(59,130,246,0.1)] rounded mx-auto" />
    </div>
  );
}

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-[58vh] pb-16">
      {/* Hero */}
      <section className="text-center mb-20">
        <p className="font-mono text-xs tracking-[0.3em] text-accent-cyan opacity-70 mb-3 uppercase">
          Identity // Authorized
        </p>
        <h1
          className="heading-display text-5xl sm:text-7xl mb-4 text-text-primary"
          style={{ textShadow: "0 0 40px rgba(6,182,212,0.35)" }}
        >
          Adam Goad
        </h1>
        <p className="font-mono text-base sm:text-lg text-accent-cyan font-medium mb-6 tracking-wide">
          AI builder. Automation specialist. Systems thinker.
        </p>
        <p className="max-w-2xl mx-auto text-text-secondary text-lg leading-relaxed mb-8">
          Business student at Xavier University graduating May 2026. Building
          Spengo — an AI and automation platform for home service businesses.
          Self-taught developer turning ideas into production systems.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/portfolio" className="btn-primary">
            See My Work
          </Link>
          <Link href="/blog" className="btn-secondary">
            Read the Blog
          </Link>
        </div>
      </section>

      {/* Dashboard Widgets */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
        <Suspense fallback={<WidgetSkeleton />}>
          <DoorDashWidget />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton />}>
          <WorkoutWidget />
        </Suspense>
        <CurrentlyBuilding />
      </section>

      {/* Chat Agent */}
      <section className="max-w-2xl mx-auto">
        <ChatAgent />
      </section>
    </div>
  );
}
