"use client";

import { useState } from "react";

interface Project {
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

const categories = ["All", "Automation", "Web Build", "Dashboard"];

export default function PortfolioGrid({ projects }: { projects: Project[] }) {
  const [active, setActive] = useState("All");

  const filtered =
    active === "All"
      ? projects
      : projects.filter((p) => p.category === active);

  return (
    <>
      <div className="flex gap-2 mb-8 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              active === cat
                ? "bg-accent text-white"
                : "bg-[rgba(59,130,246,0.1)] text-text-secondary hover:text-text-primary border border-border"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-text-secondary">No projects yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((project) => (
            <div key={project.id} className="card flex flex-col">
              {project.featured && (
                <span className="text-xs font-semibold text-accent-cyan uppercase tracking-wider mb-2">
                  Featured
                </span>
              )}
              <h3 className="text-xl font-bold text-text-primary mb-2">
                {project.title}
              </h3>
              {project.description && (
                <p className="text-sm text-text-secondary mb-4 flex-1">
                  {project.description}
                </p>
              )}
              {project.stack && project.stack.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-4">
                  {project.stack.map((tech) => (
                    <span
                      key={tech}
                      className="text-xs px-2 py-1 rounded bg-[rgba(6,182,212,0.1)] text-accent-cyan border border-[rgba(6,182,212,0.2)]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                {project.github_url && (
                  <a
                    href={project.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent hover:underline"
                  >
                    GitHub
                  </a>
                )}
                {project.live_url && (
                  <a
                    href={project.live_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent-cyan hover:underline"
                  >
                    Live Demo
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
