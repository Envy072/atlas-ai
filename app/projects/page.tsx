import { supabase } from "@/lib/supabase";

export default async function ProjectsPage() {
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Projects</h1>

      <div className="grid gap-6">
        {projects?.map((project) => (
          <div
            key={project.id}
            className="rounded-2xl border p-6 shadow-sm bg-white"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                {project.title}
              </h2>

              <div className="text-3xl font-bold text-blue-600">
                {project.score}
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              {project.summary}
            </p>

            <div className="grid md:grid-cols-2 gap-6">

              <div>
                <h3 className="font-bold mb-2">Problem</h3>
                <p>{project.problem}</p>
              </div>

              <div>
                <h3 className="font-bold mb-2">Solution</h3>
                <p>{project.solution}</p>
              </div>

            </div>

          </div>
        ))}
      </div>
    </div>
  );
}