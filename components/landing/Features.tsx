import {
  BarChart3,
  Brain,
  Search,
  Users,
  Rocket,
  ShieldCheck,
} from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Market Research",
    text: "Find real customer problems before building.",
  },
  {
    icon: Brain,
    title: "AI Insights",
    text: "Analyze markets using powerful AI models.",
  },
  {
    icon: Users,
    title: "Competitor Analysis",
    text: "Track competitors and discover opportunities.",
  },
  {
    icon: BarChart3,
    title: "Growth Metrics",
    text: "Measure market size and demand instantly.",
  },
  {
    icon: Rocket,
    title: "Launch Faster",
    text: "Reduce months of research into minutes.",
  },
  {
    icon: ShieldCheck,
    title: "Reliable Decisions",
    text: "Validate startup ideas before investing.",
  },
];

export default function Features() {
  return (
    <section id="features" className="bg-gray-50 py-28">
      <div className="mx-auto max-w-7xl px-6">

        <div className="text-center">
          <p className="font-semibold text-blue-600">
            FEATURES
          </p>

          <h2 className="mt-3 text-5xl font-bold">
            Everything you need
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            Atlas AI gives founders every tool they need to validate ideas,
            analyze competitors and discover real opportunities.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">

          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border bg-white p-8 shadow-sm transition hover:-translate-y-2 hover:shadow-xl"
            >
              <feature.icon
                className="mb-6 text-blue-600"
                size={36}
              />

              <h3 className="text-2xl font-bold">
                {feature.title}
              </h3>

              <p className="mt-4 leading-7 text-gray-600">
                {feature.text}
              </p>
            </div>
          ))}

        </div>
      </div>
    </section>
  );
}