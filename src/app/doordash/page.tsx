import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import FadeIn from "@/components/FadeIn";
import GoalProgress from "./components/GoalProgress";
import EarningsChart from "./components/EarningsChart";
import ContributionGraph from "./components/ContributionGraph";
import ShiftsTable from "./components/ShiftsTable";

export const dynamic = "force-dynamic";

export default async function DoorDashPage() {
  const supabase = await createServiceClient();

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [{ data: logs }, { data: goal }] = await Promise.all([
    supabase
      .from("doordash_logs")
      .select("*, doordash_deliveries(*)")
      .order("date", { ascending: false }),
    supabase
      .from("doordash_goals")
      .select("*")
      .eq("month", thisMonth)
      .maybeSingle(),
  ]);

  const allLogs = logs || [];

  const totalEarned = allLogs.reduce((a, l) => a + (Number(l.income) || 0), 0);
  const totalHours = allLogs.reduce((a, l) => a + (Number(l.hours) || 0), 0);
  const totalMiles = allLogs.reduce((a, l) => a + (Number(l.miles) || 0), 0);
  const totalExpenses = allLogs.reduce((a, l) => a + (Number(l.expenses) || 0), 0);
  const netEarned = totalEarned - totalExpenses;
  const avgPerHour = totalHours > 0 ? totalEarned / totalHours : 0;
  const monthEarned = allLogs
    .filter(l => l.date?.startsWith(thisMonth))
    .reduce((a, l) => a + (Number(l.income) || 0), 0);

  const currentMonthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const dasherStats = {
    rating: 92,
    acceptance: 97,
    completion: 100,
    onTime: 96,
    customerRating: 4.83,
    lifetimeDeliveries: 1864,
  };

  const stats = [
    { label: "Total Earned", value: `$${totalEarned.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` },
    { label: "This Month", value: `$${monthEarned.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` },
    { label: "Total Hours", value: `${totalHours.toFixed(1)}h` },
    { label: "Miles Driven", value: totalMiles > 0 ? totalMiles.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "—" },
    { label: "Avg $/hr", value: `$${avgPerHour.toFixed(2)}` },
    { label: "Net Earned", value: `$${netEarned.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` },
  ];

  const chartLogs = allLogs.map(l => ({ date: l.date, income: l.income }));

  return (
    <>
      {/* Fixed background layer */}
      <div className="doordash-bg" aria-hidden="true" />

      <main className="relative z-10 min-h-screen py-12 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">

          {/* Back link */}
          <FadeIn direction="down">
            <Link href="/" className="inline-flex items-center gap-1.5 font-serif text-sm font-semibold text-black hover:text-black/70 transition-colors mb-6">
              ← Back
            </Link>
          </FadeIn>

          {/* Giant floating panel */}
          <FadeIn delay={0.05}>
            <div className="doordash-panel px-10 py-12 space-y-12">

              {/* Header — centered */}
              <div className="text-center space-y-4 pb-6 border-b border-slate-200">
                <h1 className="font-serif text-5xl md:text-6xl font-bold text-black">
                  Adam&apos;s DoorDash Tracker
                </h1>
                <p className="font-sans text-base md:text-lg font-bold text-black leading-relaxed max-w-2xl mx-auto">
                  Welcome to my DoorDash tracker, where you can see my progress, my profit, and the amount of Raising Cane&apos;s I deliver each week. This is also my main source of income for my cloud and API bills, so I take this very seriously (I also enjoy driving).
                </p>
              </div>

              {/* Stats Bar */}
              <FadeIn delay={0.1}>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {stats.map((stat, i) => (
                    <div key={i} className="doordash-card text-center">
                      <p className="font-mono text-xl font-bold text-black">{stat.value}</p>
                      <p className="font-serif text-xs font-semibold text-black uppercase tracking-wide mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </FadeIn>

              {/* Monthly Goal + Earnings Chart side by side */}
              <FadeIn delay={0.15}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Goal spans 1 column */}
                  <div className="lg:col-span-1">
                    {goal ? (
                      <GoalProgress
                        monthLabel={currentMonthLabel}
                        earned={monthEarned}
                        target={Number(goal.target_income)}
                      />
                    ) : (
                      <div className="doordash-card h-full flex items-center justify-center">
                        <p className="font-sans text-sm text-black/40">No goal set for {currentMonthLabel}.</p>
                      </div>
                    )}
                  </div>

                  {/* Chart spans 2 columns */}
                  <div className="lg:col-span-2 doordash-card">
                    <EarningsChart logs={chartLogs} />
                  </div>
                </div>
              </FadeIn>

              {/* Dasher Stats */}
              <FadeIn delay={0.2}>
                <div className="doordash-card">
                  <h3 className="font-serif text-sm font-bold text-black uppercase tracking-wider mb-4">Dasher Stats</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
                    {[
                      { label: "Overall Rating", value: `${dasherStats.rating}/100` },
                      { label: "Acceptance", value: `${dasherStats.acceptance}%` },
                      { label: "Completion", value: `${dasherStats.completion}%` },
                      { label: "On-Time", value: `${dasherStats.onTime}%` },
                      { label: "Cust. Rating", value: `${dasherStats.customerRating}` },
                      { label: "Lifetime Trips", value: dasherStats.lifetimeDeliveries.toLocaleString() },
                    ].map((s, i) => (
                      <div key={i}>
                        <p className="font-mono text-xl font-bold text-black">{s.value}</p>
                        <p className="font-serif text-xs font-semibold text-black uppercase tracking-wide mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>

              {/* Contribution Graph — full width, near bottom */}
              <FadeIn delay={0.25}>
                <ContributionGraph logs={chartLogs} />
              </FadeIn>

              {/* Shifts Table */}
              <FadeIn delay={0.3}>
                <div className="doordash-card">
                  <ShiftsTable logs={allLogs} />
                </div>
              </FadeIn>

            </div>
          </FadeIn>
        </div>
      </main>
    </>
  );
}
