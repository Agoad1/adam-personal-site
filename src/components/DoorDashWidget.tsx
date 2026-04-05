import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";

export default async function DoorDashWidget() {
  let totalEarned = 0;
  let monthEarned = 0;
  let totalMiles = 0;

  try {
    const supabase = await createServiceClient();

    const { data: allLogs } = await supabase
      .from("doordash_logs")
      .select("income, miles, date");

    if (allLogs) {
      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      for (const log of allLogs) {
        totalEarned += Number(log.income) || 0;
        totalMiles += Number(log.miles) || 0;
        if (log.date?.startsWith(thisMonth)) {
          monthEarned += Number(log.income) || 0;
        }
      }
    }
  } catch {
    // Supabase not configured yet — show zeros
  }

  return (
    <Link href="/doordash" className="block h-full group">
      <div className="card flex flex-col gap-3 h-full transition-transform group-hover:-translate-y-0.5">
        <h3 className="font-serif text-sm font-bold text-slate-900 uppercase tracking-wider">
          DoorDash Tracker
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="font-mono text-2xl font-bold text-slate-900">
              ${totalEarned.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="font-serif text-sm font-bold text-slate-800 mt-1 uppercase tracking-wide">All Time</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-slate-900">
              ${monthEarned.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="font-serif text-sm font-bold text-slate-800 mt-1 uppercase tracking-wide">This Month</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-slate-900">
              {totalMiles.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </p>
            <p className="font-serif text-sm font-bold text-slate-800 mt-1 uppercase tracking-wide">Miles</p>
          </div>
        </div>
        <p className="font-serif text-xs font-semibold text-slate-700 mt-auto text-center">
          Real data. Updated manually. →
        </p>
      </div>
    </Link>
  );
}
