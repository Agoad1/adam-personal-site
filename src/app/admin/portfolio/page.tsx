"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  stack: string[] | null;
  category: string | null;
  github_url: string | null;
  live_url: string | null;
  image_url: string | null;
  featured: boolean;
}

const emptyForm = {
  title: "",
  description: "",
  stack: "",
  category: "Automation",
  github_url: "",
  live_url: "",
  image_url: "",
  featured: false,
};

export default function AdminPortfolio() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadItems = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("portfolio")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setItems(data);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  function startEdit(item: PortfolioItem) {
    setEditId(item.id);
    setForm({
      title: item.title,
      description: item.description || "",
      stack: item.stack?.join(", ") || "",
      category: item.category || "Automation",
      github_url: item.github_url || "",
      live_url: item.live_url || "",
      image_url: item.image_url || "",
      featured: item.featured,
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const supabase = createClient();
    const payload = {
      title: form.title,
      description: form.description || null,
      stack: form.stack
        ? form.stack
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      category: form.category,
      github_url: form.github_url || null,
      live_url: form.live_url || null,
      image_url: form.image_url || null,
      featured: form.featured,
    };

    let result;
    if (editId) {
      result = await supabase.from("portfolio").update(payload).eq("id", editId);
    } else {
      result = await supabase.from("portfolio").insert(payload);
    }

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setForm(emptyForm);
    setEditId(null);
    setSaving(false);
    loadItems();
  }

  return (
    <div>
      <h1 className="heading-display text-2xl mb-6">Portfolio</h1>

      <form onSubmit={handleSave} className="card space-y-3 mb-8 max-w-2xl">
        <h2 className="font-semibold text-text-primary">
          {editId ? "Edit Item" : "Add New Item"}
        </h2>

        <input
          type="text"
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          className="w-full bg-[rgba(5,10,20,0.6)] border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          className="w-full bg-[rgba(5,10,20,0.6)] border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
        />
        <input
          type="text"
          placeholder="Stack (comma separated)"
          value={form.stack}
          onChange={(e) => setForm({ ...form, stack: e.target.value })}
          className="w-full bg-[rgba(5,10,20,0.6)] border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
        />
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="w-full bg-[rgba(5,10,20,0.6)] border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="Automation">Automation</option>
          <option value="Web Build">Web Build</option>
          <option value="Dashboard">Dashboard</option>
        </select>
        <input
          type="url"
          placeholder="GitHub URL"
          value={form.github_url}
          onChange={(e) => setForm({ ...form, github_url: e.target.value })}
          className="w-full bg-[rgba(5,10,20,0.6)] border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
        />
        <input
          type="url"
          placeholder="Live URL"
          value={form.live_url}
          onChange={(e) => setForm({ ...form, live_url: e.target.value })}
          className="w-full bg-[rgba(5,10,20,0.6)] border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
        />
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            className="accent-accent"
          />
          <span className="text-sm text-text-secondary">Featured</span>
        </label>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : editId ? "Update" : "Add"}
          </button>
          {editId && (
            <button
              type="button"
              onClick={() => {
                setEditId(null);
                setForm(emptyForm);
              }}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="card flex items-center justify-between gap-4 cursor-pointer hover:border-accent transition-colors"
            onClick={() => startEdit(item)}
          >
            <div>
              <h3 className="font-semibold text-text-primary">{item.title}</h3>
              <p className="text-xs text-text-secondary">
                {item.category} {item.featured ? "- Featured" : ""}
              </p>
            </div>
            <span className="text-xs text-accent">Edit</span>
          </div>
        ))}
      </div>
    </div>
  );
}
