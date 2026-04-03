import { createServiceClient } from "@/lib/supabase/server";

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const sorted = [...new Set(dates)].sort().reverse();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mostRecent = new Date(sorted[0] + "T00:00:00");
  const diffDays = Math.floor(
    (today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24)
  );

  // If most recent workout is more than 1 day ago, streak is broken
  if (diffDays > 1) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00");
    const curr = new Date(sorted[i] + "T00:00:00");
    const diff = Math.floor(
      (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export default async function WorkoutWidget() {
  let streak = 0;
  let totalWorkouts = 0;
  let lastType = "—";
  let lastDate = "—";

  try {
    const supabase = await createServiceClient();

    const { data: logs } = await supabase
      .from("workout_logs")
      .select("date, type")
      .order("date", { ascending: false });

    if (logs && logs.length > 0) {
      totalWorkouts = logs.length;
      lastType = logs[0].type || "—";
      lastDate = new Date(logs[0].date + "T00:00:00").toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric" }
      );
      streak = calculateStreak(logs.map((l) => l.date));
    }
  } catch {
    // Supabase not configured yet
  }

  return (
    <div className="card flex flex-col gap-3">
      <h3 className="font-serif text-sm font-bold text-slate-900 uppercase tracking-wider">
        Workout Streak
      </h3>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="font-mono text-2xl font-bold text-slate-900">{streak}</p>
          <p className="font-serif text-sm font-bold text-slate-800 mt-1 uppercase tracking-wide">Day Streak</p>
        </div>
        <div>
          <p className="font-mono text-2xl font-bold text-slate-900">
            {totalWorkouts}
          </p>
          <p className="font-serif text-sm font-bold text-slate-800 mt-1 uppercase tracking-wide">Total</p>
        </div>
        <div>
          <p className="font-serif text-sm font-bold text-slate-900">{lastType}</p>
          <p className="font-serif text-sm font-bold text-slate-800 mt-1 uppercase tracking-wide">{lastDate}</p>
        </div>
      </div>
    </div>
  );
}
