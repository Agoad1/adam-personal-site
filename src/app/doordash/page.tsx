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

  const [{ data: logs }, { data: deliveries }, { data: goal }] = await Promise.all([
    supabase
      .from("doordash_logs")
      .select("*, doordash_deliveries(*)")
      .order("date", { ascending: false }),
    supabase.from("doordash_deliveries").select("*"),
    supabase
      .from("doordash_goals")
      .select("*")
      .eq("month", (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      })())
      .maybeSingle(),
  ]);

  const allLogs = logs || [];

  // Computed stats
  const totalEarned = allLogs.reduce((a, l) => a + (l.income || 0), 0);
  const totalHours = allLogs.reduce((a, l) => a + (l.hours || 0), 0);
  const totalMiles = allLogs.reduce((a, l) => a + (l.miles || 0), 0);
  const totalExpenses = allLogs.reduce((a, l) => a + (l.expenses || 0), 0);
  const netEarned = totalEarned - totalExpenses;
  const avgPerHour = totalHours > 0 ? totalEarned / totalHours : 0;

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthEarned = allLogs
    .filter(l => l.date?.startsWith(thisMonth))
    .reduce((a, l) => a + (l.income || 0), 0);

  const workedDates = allLogs.map(l => l.date as string).filter(Boolean);

  const currentMonthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const dasherStats = {
    rating: 92,
    acceptance: 97,
    completion: 100,
    onTime: 96,
    customerRating: 4.83,
    lifetimeDeliveries: 1864,
  };

  return (
    <main className="min-h-screen pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-8">

        {/* Header */}
        <FadeIn direction="down">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-serif text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
              ← Back
            </Link>
          </div>
          <div className="mt-4">
            <h1 className="font-serif text-4xl font-bold text-white">DoorDash Tracker</h1>
            <p className="font-serif text-slate-400 mt-1 text-sm">
              Real data. Every dollar, every mile, every delivery.
            </p>
          </div>
        </FadeIn>

        {/* Stats Bar */}
        <FadeIn delay={0.1}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Total Earned", value: `$${totalEarned.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` },
              { label: "This Month", value: `$${monthEarned.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` },
              { label: "Total Hours", value: `${totalHours.toFixed(1)}h` },
              { label: "Miles Driven", value: totalMiles.toLocaleString("en-US", { maximumFractionDigits: 0 }) },
              { label: "Avg $/hr", value: `$${avgPerHour.toFixed(2)}` },
              { label: "Net Earned", value: `$${netEarned.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` },
            ].map((stat, i) => (
              <div key={i} className="card text-center py-4">
                <p className="font-mono text-xl font-bold text-slate-900">{stat.value}</p>
                <p className="font-serif text-xs font-semibold text-slate-600 uppercase tracking-wide mt-1">{stat.label}</p>
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
            <CalendarGrid workedDates={workedDates} />
            <EarningsChart logs={allLogs.map(l => ({ date: l.date, income: l.income }))} />
          </div>
        </FadeIn>

        {/* Dasher Stats */}
        <FadeIn delay={0.25}>
          <div className="card space-y-4">
            <h3 className="font-serif text-sm font-bold text-slate-900 uppercase tracking-wider">Dasher Stats</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
              <div>
                <p className="font-mono text-2xl font-bold text-slate-900">{dasherStats.rating}/100</p>
                <p className="font-serif text-xs font-semibold text-slate-600 uppercase tracking-wide mt-1">Overall Rating</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-slate-900">{dasherStats.acceptance}%</p>
                <p className="font-serif text-xs font-semibold text-slate-600 uppercase tracking-wide mt-1">Acceptance</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-slate-900">{dasherStats.completion}%</p>
                <p className="font-serif text-xs font-semibold text-slate-600 uppercase tracking-wide mt-1">Completion</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-slate-900">{dasherStats.onTime}%</p>
                <p className="font-serif text-xs font-semibold text-slate-600 uppercase tracking-wide mt-1">On-Time</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-slate-900">{dasherStats.customerRating}</p>
                <p className="font-serif text-xs font-semibold text-slate-600 uppercase tracking-wide mt-1">Cust. Rating</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-slate-900">{dasherStats.lifetimeDeliveries.toLocaleString()}</p>
                <p className="font-serif text-xs font-semibold text-slate-600 uppercase tracking-wide mt-1">Lifetime Trips</p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Shifts Table */}
        <FadeIn delay={0.3}>
          <ShiftsTable logs={allLogs} />
        </FadeIn>

      </div>
    </main>
  );
}
