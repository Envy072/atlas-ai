"use client";

import {
  FolderKanban,
  ArrowUpRight,
  Clock3,
} from "lucide-react";

const projects = [
  {
    name: "Atlas AI",
    stage: "In Progress",
    score: 91,
    updated: "2 min ago",
  },
  {
    name: "Path UK",
    stage: "Research",
    score: 84,
    updated: "1 hour ago",
  },
  {
    name: "Sudanese Incense",
    stage: "Idea",
    score: 76,
    updated: "Yesterday",
  },
];

export default function RecentProjects() {
  return (
    <div className="flex h-[700px] flex-col rounded-3xl border border-gray-200 bg-white shadow-sm">

      <div className="flex items-center justify-between border-b p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-2">
            <FolderKanban className="h-6 w-6 text-blue-600" />
          </div>

          <div>
            <h2 className="text-xl font-bold">
              Recent Projects
            </h2>

            <p className="text-sm text-gray-500">
              Your latest startup ideas
            </p>
          </div>
        </div>

        <button className="rounded-xl bg-gray-100 px-3 py-2 text-sm transition hover:bg-gray-200">
          View all
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-6">

        {projects.map((project) => (
          <div
            key={project.name}
            className="rounded-2xl border border-gray-200 p-5 transition hover:-translate-y-1 hover:border-blue-500 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">

              <div>
                <h3 className="text-lg font-semibold">
                  {project.name}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {project.stage}
                </p>
              </div>

              <ArrowUpRight className="h-5 w-5 text-gray-400" />

            </div>

            <div className="mt-6 flex items-center justify-between">

              <div>
                <p className="text-3xl font-bold text-blue-600">
                  {project.score}
                </p>

                <p className="text-xs text-gray-500">
                  AI Score
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock3 className="h-4 w-4" />
                {project.updated}
              </div>

            </div>

          </div>
        ))}

      </div>

      <div className="border-t p-5">
        <button className="w-full rounded-2xl bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-700">
          + Create New Project
        </button>
      </div>

    </div>
  );
}