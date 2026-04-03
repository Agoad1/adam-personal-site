import { createServiceClient } from "@/lib/supabase/server";
import PortfolioGrid from "@/components/PortfolioGrid";

export default async function PortfolioPage() {
  let projects: Array<{
    id: string;
    title: string;
    description: string | null;
    stack: string[] | null;
    category: string | null;
    github_url: string | null;
    live_url: string | null;
    image_url: string | null;
    featured: boolean;
  }> = [];

  try {
    const supabase = await createServiceClient();
    const { data } = await supabase
      .from("portfolio")
      .select("*")
      .order("featured", { ascending: false });

    if (data) projects = data;
  } catch {
    // Supabase not configured
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="heading-display text-4xl mb-2">Portfolio</h1>
      <p className="text-text-secondary mb-10">
        Projects, automations, and things I&apos;ve built.
      </p>
      <PortfolioGrid projects={projects} />
    </div>
  );
}
