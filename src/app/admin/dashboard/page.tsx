"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface DoorDashLog {
  id: string;
  date: string;
  income: number;
  miles: number;
  expenses: number;
  hours: number;
  notes: string | null;
}

interface WorkoutLog {
  id: string;
  date: string;
  type: string;
  duration_minutes: number;
  notes: string | null;
}

export default function AdminDashboard() {
  const [ddForm, setDdForm] = useState({
    date: new Date().toISOString().split("T")[0],
    income: "",
    miles: "",
    expenses: "",
    hours: "",
    notes: "",
  });
  const [wForm, setWForm] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "Lift",
    duration_minutes: "",
    notes: "",
  });
  const [recentDD, setRecentDD] = useState<DoorDashLog[]>([]);
  const [recentW, setRecentW] = useState<WorkoutLog[]>([]);
  const [savingDD, setSavingDD] = useState(false);
  const [savingW, setSavingW] = useState(false);
  const [error, setError] = useState("");

  const loadRecent = useCallback(async () => {
    const supabase = createClient();
    const { data: dd } = await supabase
      .from("doordash_logs")
      .select("*")
      .order("date", { ascending: false })
      .limit(5);
    if (dd) setRecentDD(dd);

    const { data: w } = await supabase
      .from("workout_logs")
      .select("*")
      .order("date", { ascending: false })
      .limit(5);
    if (w) setRecentW(w);
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  async function handleDoorDash(e: React.FormEvent) {
    e.preventDefault();
    setSavingDD(true);
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase.from("doordash_logs").insert({
      date: ddForm.date,
      income: parseFloat(ddForm.income) || 0,
      miles: parseFloat(ddForm.miles) || 0,
      expenses: parseFloat(ddForm.expenses) || 0,
      hours: parseFloat(ddForm.hours) || 0,
      notes: ddForm.notes || null,
    });
    if (err) setError(err.message);
    else {
      setDdForm({
        date: new Date().toISOString().split("T")[0],
        income: "",
        miles: "",
        expenses: "",
        hours: "",
        notes: "",
      });
      loadRecent();
    }
    setSavingDD(false);
  }

  async function handleWorkout(e: React.FormEvent) {
    e.preventDefault();
    setSavingW(true);
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase.from("workout_logs").insert({
      date: wForm.date,
      type: wForm.type,
      duration_minutes: parseInt(wForm.duration_minutes) || 0,
      notes: wForm.notes || null,
    });
    if (err) setError(err.message);
    else {
      setWForm({
        date: new Date().toISOString().split("T")[0],
        type: "Lift",
        duration_minutes: "",
        notes: "",
      });
      loadRecent();
    }
    setSavingW(false);
  }

  const inputClass =
    "w-full bg-[rgba(5,10,20,0.6)] border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent";

  return (
    <div>
      <h1 className="heading-display text-2xl mb-6">Dashboard</h1>
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* DoorDash Form */}
        <form onSubmit={handleDoorDash} className="card space-y-3">
          <h2 className="font-semibold text-accent">Log DoorDash Session</h2>
          <input
            type="date"
            value={ddForm.date}
            onChange={(e) => setDdForm({ ...ddForm, date: e.target.value })}
            required
            className={inputClass}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              step="0.01"
              placeholder="Income ($)"
              value={ddForm.income}
              onChange={(e) => setDdForm({ ...ddForm, income: e.target.value })}
              className={inputClass}
            />
            <input
              type="number"
              step="0.1"
              placeholder="Miles"
              value={ddForm.miles}
              onChange={(e) => setDdForm({ ...ddForm, miles: e.target.value })}
              className={inputClass}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Expenses ($)"
              value={ddForm.expenses}
              onChange={(e) =>
                setDdForm({ ...ddForm, expenses: e.target.value })
              }
              className={inputClass}
            />
            <input
              type="number"
              step="0.1"
              placeholder="Hours"
              value={ddForm.hours}
              onChange={(e) => setDdForm({ ...ddForm, hours: e.target.value })}
              className={inputClass}
            />
          </div>
          <input
            type="text"
            placeholder="Notes"
            value={ddForm.notes}
            onChange={(e) => setDdForm({ ...ddForm, notes: e.target.value })}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={savingDD}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {savingDD ? "Saving..." : "Log Session"}
          </button>
        </form>

        {/* Workout Form */}
        <form onSubmit={handleWorkout} className="card space-y-3">
          <h2 className="font-semibold text-accent-cyan">Log Workout</h2>
          <input
            type="date"
            value={wForm.date}
            onChange={(e) => setWForm({ ...wForm, date: e.target.value })}
            required
            className={inputClass}
          />
          <select
            value={wForm.type}
            onChange={(e) => setWForm({ ...wForm, type: e.target.value })}
            className={inputClass}
          >
            <option value="Lift">Lift</option>
            <option value="Cardio">Cardio</option>
            <option value="Hockey">Hockey</option>
            <option value="Conditioning">Conditioning</option>
          </select>
          <input
            type="number"
            placeholder="Duration (minutes)"
            value={wForm.duration_minutes}
            onChange={(e) =>
              setWForm({ ...wForm, duration_minutes: e.target.value })
            }
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Notes"
            value={wForm.notes}
            onChange={(e) => setWForm({ ...wForm, notes: e.target.value })}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={savingW}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {savingW ? "Saving..." : "Log Workout"}
          </button>
        </form>
      </div>

      {/* Recent Entries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-text-primary mb-3">
            Recent DoorDash
          </h3>
          {recentDD.length === 0 ? (
            <p className="text-sm text-text-secondary">No entries yet.</p>
          ) : (
            <div className="space-y-2">
              {recentDD.map((log) => (
                <div key={log.id} className="card py-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-primary">{log.date}</span>
                    <span className="text-accent font-semibold">
                      ${Number(log.income).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    {Number(log.miles).toFixed(1)} mi &middot;{" "}
                    {Number(log.hours).toFixed(1)} hrs
                    {log.notes ? ` — ${log.notes}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-text-primary mb-3">
            Recent Workouts
          </h3>
          {recentW.length === 0 ? (
            <p className="text-sm text-text-secondary">No entries yet.</p>
          ) : (
            <div className="space-y-2">
              {recentW.map((log) => (
                <div key={log.id} className="card py-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-primary">{log.date}</span>
                    <span className="text-accent-cyan font-semibold">
                      {log.type}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    {log.duration_minutes} min
                    {log.notes ? ` — ${log.notes}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
