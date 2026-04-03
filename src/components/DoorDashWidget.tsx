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
    <div className="card flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">
        DoorDash Tracker
      </h3>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-text-primary">
            ${totalEarned.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-text-secondary mt-1">All Time</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-text-primary">
            ${monthEarned.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-text-secondary mt-1">This Month</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-text-primary">
            {totalMiles.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-text-secondary mt-1">Miles</p>
        </div>
      </div>
      <p className="text-xs text-text-secondary mt-1">
        Real data. Updated manually.
      </p>
    </div>
  );
}
