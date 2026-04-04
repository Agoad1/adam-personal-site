import Link from "next/link";
import { Suspense } from "react";
import DoorDashWidget from "@/components/DoorDashWidget";
import WorkoutWidget from "@/components/WorkoutWidget";
import CurrentlyBuilding from "@/components/CurrentlyBuilding";
import ChatAgent from "@/components/ChatAgent";
import FadeIn from "@/components/FadeIn";

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-16">
      {/* Hero */}
      <section className="relative text-center mb-[25vh]">
        {/* Removed radial backdrop for a cleaner, editorial look */}
        
        {/* Main Title - Pure Editorial Tech */}
        <FadeIn delay={0.3} direction="up">
          <h1 className="font-serif text-4xl md:text-6xl font-bold tracking-tight text-white z-10 relative">
            Adam Goad
          </h1>
        </FadeIn>
        
        {/* Subtext Biography */}
        <FadeIn delay={0.5} direction="up">
          <p className="max-w-3xl mx-auto mt-6 text-sm sm:text-base md:text-lg font-sans font-bold text-white leading-relaxed z-10 relative drop-shadow-md">
            Xavier University Business Management major with a minor in Entrepreneurship &amp; Innovation. Hands-on operations experience with Delaware North at Great American Ball Park and Yellowstone National Park. Spent the last year going deep on AI, building workflows, agents, and automation systems from scratch.
          </p>
        </FadeIn>
      </section>

      {/* Call to Actions - Positioned right above the cards */}
      <section className="mb-10">
        <FadeIn delay={0.6} direction="up">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/portfolio" className="btn-primary">
              See My Work
            </Link>
            <Link href="/blog" className="btn-secondary">
              Read the Blog
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* Dashboard Widgets */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
        <FadeIn delay={0.8} direction="up" className="h-full">
          <Suspense fallback={<WidgetSkeleton />}>
            <DoorDashWidget />
          </Suspense>
        </FadeIn>
        <FadeIn delay={0.9} direction="up" className="h-full">
          <Suspense fallback={<WidgetSkeleton />}>
            <WorkoutWidget />
          </Suspense>
        </FadeIn>
        <FadeIn delay={1.0} direction="up" className="h-full">
          <CurrentlyBuilding />
        </FadeIn>
      </section>

      {/* Chat Agent */}
      <section className="max-w-2xl mx-auto">
        <FadeIn delay={1.1} direction="up">
          <ChatAgent />
        </FadeIn>
      </section>
    </div>
  );
}
