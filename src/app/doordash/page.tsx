import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import FadeIn from "@/components/FadeIn";
import GoalProgress from "./components/GoalProgress";
import EarningsChart from "./components/EarningsChart";
import CalendarGrid from "./components/CalendarGrid";
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

  const workedDates = allLogs
    .map(l => l.date as string)
    .filter((d): d is string => Boolean(d));

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

  return (
    <>
      {/* Fixed background layer */}
      <div className="doordash-bg" aria-hidden="true" />

      <main className="relative z-10 min-h-screen py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">

          {/* Back link */}
          <FadeIn direction="down">
            <Link href="/" className="inline-flex items-center gap-1.5 font-serif text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors mb-6">
              ← Back
            </Link>
          </FadeIn>

          {/* Giant floating panel */}
          <FadeIn delay={0.05}>
            <div className="doordash-panel px-8 py-10 space-y-10">

              {/* Bio / Header */}
              <div className="space-y-3 pb-6 border-b border-white/10">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="font-serif text-4xl font-bold text-white">DoorDash Tracker</h1>
                    <p className="font-serif text-slate-400 text-sm mt-1">Real data. Every dollar, every mile, every delivery.</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="font-mono text-xs text-slate-500 uppercase tracking-widest">Updated manually</p>
                    <p className="font-mono text-xs text-slate-600 mt-0.5">or by AI — depends on the evening</p>
                  </div>
                </div>
                <p className="font-serif text-slate-400 text-sm leading-relaxed max-w-2xl">
                  Yes, I have a degree in computer science. Yes, I also deliver Raising Cane&apos;s on weekends.
                  This is not a cry for help — it&apos;s a side hustle that pays for my cloud bills, and I built
                  a whole dashboard to prove I&apos;m serious about it. Every number here is real, logged by hand
                  (or by AI, depending on how my evening went).
                </p>
              </div>

              {/* Stats Bar */}
              <FadeIn delay={0.1}>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {stats.map((stat, i) => (
                    <div key={i} className="doordash-card text-center">
                      <p className="font-mono text-xl font-bold text-white">{stat.value}</p>
                      <p className="font-serif text-xs font-semibold text-slate-400 uppercase tracking-wide mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </FadeIn>

              {/* Monthly Goal */}
              {goal && (
                <FadeIn delay={0.15}>
                  <GoalProgress
                    monthLabel={currentMonthLabel}
                    earned={monthEarned}
                    target={Number(goal.target_income)}
                  />
                </FadeIn>
              )}

              {/* Calendar + Chart */}
              <FadeIn delay={0.2}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="doordash-card">
                    <CalendarGrid workedDates={workedDates} />
                  </div>
                  <div className="doordash-card">
                    <EarningsChart logs={allLogs.map(l => ({ date: l.date, income: l.income }))} />
                  </div>
                </div>
              </FadeIn>

              {/* Dasher Stats */}
              <FadeIn delay={0.25}>
                <div className="doordash-card">
                  <h3 className="font-serif text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Dasher Stats</h3>
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
                        <p className="font-mono text-xl font-bold text-white">{s.value}</p>
                        <p className="font-serif text-xs font-semibold text-slate-400 uppercase tracking-wide mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
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
